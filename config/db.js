import { Pool } from "pg";
import "dotenv/config"

const db = new Pool({
    host: process.env.HOST,
    port: process.env.PORT,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
})

export default db;