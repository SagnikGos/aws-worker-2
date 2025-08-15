import express from 'express';
import dotenv from 'dotenv';
import cronRoutes from './routes/cronRoutes.js';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;


app.use(express.json());


app.use('/api/cron', cronRoutes);


app.get('/', (req, res) => {
    res.status(200).send('Cron Worker is running.');
});

app.listen(PORT, () => {
    console.log(` Cron Worker server started on port ${PORT}`);
});