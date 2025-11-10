const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.q9crcyr.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const db = client.db('HomeNestDB');
const listingCollections = db.collection('Listing');

const run = async () => {
  try {
    await client.connect;

    app.get('/featured-listing', async (req, res) => {
      const result = await listingCollections
        .find()
        .limit(6)
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    app.get('/my-listing', async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
        query.email = email;
      }
      const result = await listingCollections.find(query).toArray();
      res.send(result);
    });

    app.post('/listing', async (req, res) => {
      const data = req.body;
      const result = await listingCollections.insertOne(data);
      res.send(result);
    });

    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    // await client.close();
  }
};

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('This is Home Nest Project Server');
});

app.listen(port, () => {
  console.log('HomeNest Server is running at', port);
});
