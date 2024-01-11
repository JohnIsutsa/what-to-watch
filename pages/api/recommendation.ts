import Movie from '@/types/movie';
import { readFileSync } from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next'
const pg = require('pg');
const tf = require('@tensorflow/tfjs-node');
const use = require('@tensorflow-models/universal-sentence-encoder');

const config = {
  user: process.env.PG_NAME,
  password: process.env.PG_PASSWORD,
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: "defaultdb",
  ssl: {
    rejectUnauthorized: true,
    ca: readFileSync('./certificates/ca.pem').toString(),
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Movie>
) {
  const { search } = req.body;

  const model = await use.load();
  const embedding = await model.embed('cats');
  const embeddingArray = embedding.arraySync()[0];

  const client = new pg.Client(config);
  client.connect();

  try {
    const pgResponse = await client.query(
      `SELECT * FROM movie_plots 
      ORDER BY embedding <-> '${JSON.stringify(embeddingArray)}'
      LIMIT 5`
    )
    console.log(pgResponse.rows);
    res.status(200).json(pgResponse.rows);
  } catch (error: any) {
    console.log(error);
    res.status(500);
  } finally {
    client.end();
  }
} 
