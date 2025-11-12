const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.q9crcyr.mongodb.net/?appName=Cluster0`;

const admin = require('firebase-admin');

const decoded = Buffer.from(
  process.env.FIREBASE_SERVICE_KEY,
  'base64'
).toString('utf8');
const serviceAccount = JSON.parse(decoded);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
});

const secureApi = async (req, res, next) => {
  const authorization = req.headers.authorization;
  // console.log(req.headers.authorization);
  if (!authorization) {
    return res.status(401).send({ message: 'Unauthorized access' });
  }
  const token = authorization.split(' ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    console.log(decoded);
    req.token_email = decoded.email;
    next();
  } catch (error) {
    return res.status(401).send({ message: 'Unauthorized access' });
  }
};

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

    app.get('/my-listing', secureApi, async (req, res) => {
      const email = req.query.email;
      const query = {};

      if (email) {
        query.email = email;
        if (email !== req.token_email) {
          return res.status(403).send({ message: 'Forbidden access' });
        }
      }
      const result = await listingCollections.find(query).toArray();
      res.send(result);
    });

    // Get single property details secured
    app.get('/listing/:id', secureApi, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await listingCollections.findOne(query);
      res.send(result);
    });

    // Get all rating by single product
    app.get('/ratings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { propertyId: id };
      const result = await ratingCollections.find(query).limit(5).toArray();
      res.send(result);
    });

    // Get user rating secured
    app.get('/my-ratings', secureApi, async (req, res) => {
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
        const {
          category,
          minPrice,
          maxPrice,
          propertyName,
          sort,
          _start,
          _limit,
        } = req.query;

        // console.log(req.query);
        const start = parseInt(_start) || 0;
        const limit = parseInt(_limit) || 9;
        const filter = {};
        if (category && category !== 'All') {
          filter.category = category;
        }
        if (propertyName) {
          filter.propertyName = { $regex: propertyName, $options: 'i' };
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

        const totalCount = await listingCollections.countDocuments(filter);

        const result = await listingCollections
          .find(filter)
          .sort(sortObj)
          .skip(start)
          .limit(limit)
          .toArray();
        res.send({ data: result, total: totalCount });
      } catch (error) {
        console.error(error);
        res.send(error);
      }
    });

    // Fetch Data Api End..................................

    // Update property by user secured
    app.patch('/my-listing/:id', secureApi, async (req, res) => {
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

    // Delete property by user secured
    app.delete('/my-listing/:id', secureApi, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await listingCollections.deleteOne(query);
      res.send(result);
    });

    // Insert or add property by user secured
    app.post('/listing', secureApi, async (req, res) => {
      const data = req.body;
      const result = await listingCollections.insertOne(data);
      res.send(result);
    });

    app.post('/ratings', secureApi, async (req, res) => {
      const data = req.body;
      const result = await ratingCollections.insertOne(data);
      res.send(result);
    });

    // await client.db('admin').command({ ping: 1 });
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
