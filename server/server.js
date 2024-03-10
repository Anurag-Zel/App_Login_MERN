import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import connect from './database/conn.js';
import router from './router/route.js';
import bodyParser from 'body-parser';

const app = express();

/** middlewares */
app.use(express.json());
app.use(cors());
app.use(morgan('tiny'));
app.disable('x-powered-by'); // less hackers know about our stack

// Middleware to enable CORS
// app.use((req, res, next) => {
//     res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
//     res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
//     res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//     next();
//   });

const port = 8080;

// Middleware to parse incoming request bodies
app.use(bodyParser.json({ limit: '10mb' })); // Increase the limit as needed


/** HTTP GET Request */
app.get('/', (req, res) => {
    res.status(201).json("Home GET Request");
});

/**api routes */
app.use('/api', router);

/** start server only when we have valid connection */
connect().then(() => {
    try {
        app.listen(port, () => {
            console.log(`Server connected to http://localhost:${port}`);
        })
    } catch (error) {
        console.log('Cannot connect to the server')
    }
}).catch(error => {
    console.log("Invalid database connection...!");
})