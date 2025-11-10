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
    strict: false,
    deprecationErrors: true,
  },
});

const db = client.db('HomeNestDB');
const listingCollections = db.collection('Listing');
const ratingCollections = db.collection('Ratings');

const run = async () => {
  try {
    await client.connect;

    // Fetch Data Api Start..................................
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

    app.get('/listing/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await listingCollections.findOne(query);
      res.send(result);
    });

    app.get('/ratings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { propertyId: id };
      const result = await ratingCollections.find(query).limit(5).toArray();
      res.send(result);
    });

    app.get('/my-ratings', async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
        query.reviewerEmail = email;
      }
      const result = await ratingCollections.find(query).toArray();
      res.send(result);
    });

    app.get('/categories', async (req, res) => {
      try {
        const categories = await listingCollections.distinct('category');
        res.send(categories);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });
    app.get('/price-range', async (req, res) => {
      try {
        const prices = await listingCollections
          .find()
          .project({ price: 1 })
          .toArray();
        const allPrices = prices.map(p => p.price);
        const minPrice = Math.min(...allPrices);
        const maxPrice = Math.max(...allPrices);
        res.send({ minPrice, maxPrice });
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    app.get('/listings', async (req, res) => {
      try {
        const { category, minPrice, maxPrice, location, sort } = req.query;

        const filter = {};
        if (category && category !== 'All') {
          filter.category = category;
        }
        if (location) {
          filter.location = { $regex: location, $options: 'i' };
        }
        if (minPrice || maxPrice) {
          filter.price = {};
          if (minPrice) filter.price.$gte = Number(minPrice);
          if (maxPrice) filter.price.$lte = Number(maxPrice);
        }
        let sortObj = {};
        if (sort === 'price-asc') sortObj = { price: 1 };
        else if (sort === 'price-desc') sortObj = { price: -1 };
        else if (sort === 'latest') sortObj = { createdAt: -1 };

        const result = await listingCollections
          .find(filter)
          .sort(sortObj)
          .toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.send(error);
      }
    });

    // Fetch Data Api End..................................

    app.patch('/my-listing/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      console.log(query);
      const { _id, ...data } = req.body;
      console.log(data);
      const updatedData = {
        $set: data,
      };
      const result = await listingCollections.updateOne(query, updatedData);
      res.send(result);
    });

    app.delete('/my-listing/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await listingCollections.deleteOne(query);
      res.send(result);
    });

    app.post('/listing', async (req, res) => {
      const data = req.body;
      const result = await listingCollections.insertOne(data);
      res.send(result);
    });

    app.post('/ratings', async (req, res) => {
      const data = req.body;
      const result = await ratingCollections.insertOne(data);
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
