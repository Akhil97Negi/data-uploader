import express from 'express'
import fs from 'fs'
import cron from 'cron'
import winston from 'winston'
// import Ser from 'socket.io'
import { Server } from 'socket.io'
import http from 'http'
import { Entry } from './models/entry.js'
import connectToDB from './configs/db.js'
import { config } from 'dotenv'

config();



const url = process.env.URL || null
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());


// Setup Winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// Serve static files for the dashboard
app.use(express.static('public'));

// WebSocket connection for real-time logging
io.on('connection', (socket) => {
    console.log('New client connected');
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Function to read data from file and update database
const readAndUpdateDatabase = () => {
    fs.readFile('data.json', 'utf8', (err, data) => {
        if (err) {
            logger.error(`Error reading file: ${err}`);
            return;
        }

        let jsonData;
        try {
            jsonData = JSON.parse(data);
        } catch (parseError) {
            logger.error(`Error parsing JSON: ${parseError}`);
            return;
        }

        jsonData.forEach(entry => {
            checkAndInsertToDatabase(entry);
        });
    });
};

// Function to check and insert data into the database
const checkAndInsertToDatabase = async (entry) => {
    try {
        const existingEntry = await Entry.findOne({ id: entry.id });
        if (!existingEntry) {
            const newEntry = new Entry(entry);
            await newEntry.save();
            logger.info(`Inserted entry: ${JSON.stringify(entry)}`);
            io.emit('log', { level: 'info', message: `Inserted entry: ${JSON.stringify(entry)}` });
        } else {
            logger.error(`Entry with id ${entry.id} already exists`);
            io.emit('log', { level: 'error', message: `Entry with id ${entry.id} already exists` });
        }
    } catch (err) {
        logger.error(`Error inserting entry: ${err}`);
        io.emit('log', { level: 'error', message: `Error inserting entry: ${err}` });
    }
};

// Ignore requests for favicon.ico
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});


// POST request handler to manually insert data
app.post('/add-entry', async (req, res) => {
    const entry = req.body;
    try {
        await checkAndInsertToDatabase(entry);
        res.status(200).send({ message: 'Entry processed' });
    } catch (err) {
        res.status(500).send({ error: 'Failed to process entry' });
    }
});

// Schedule job to run twice a day
const job = new cron.CronJob('0 0,12 * * *', () => {
    logger.info('Running scheduled job');
    readAndUpdateDatabase();
}, null, true, 'Asia/Kolkata');

job.start();

server.listen(PORT, async () => {
     try {
        await connectToDB(url);
    console.log(`Server is running on port ${PORT}`);
     } catch (error) {
        console.log(error);
     }
});
