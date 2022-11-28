const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken')



const app = express()
const port = process.env.PORT || 5000;


app.use(cors())
app.use(express.json())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.c0svav3.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const bikeCollections = client.db('bdBikeMath').collection('bikeCollections');
        const userCollections = client.db('bdBikeMath').collection('users');

        // bike 

        app.get('/bikes/:brand', async (req, res) => {
            const brand = req.params.brand
            const query = { brand: brand }
            const bikes = await bikeCollections.find(query).toArray();
            res.send(bikes);
        })


        // jwt 

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await userCollections.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1d' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        })


        // users 

        app.get('/users/buyer', async (req, res) => {
            const query = { userCategory: 'Buyer' };
            const users = await userCollections.find(query).toArray();
            res.send(users)
        })
        app.get('/users/seller', async (req, res) => {
            const query = { userCategory: 'Seller' };
            const users = await userCollections.find(query).toArray();
            res.send(users)
        })


        app.post('/users', async (req, res) => {
            const email = req.body.email;
            const query = { email: email }
            const alreadyExist = await userCollections.findOne(query)
            if (alreadyExist) {
                const filter = {email : email}
                const options = { upsert: true };
                const updatedDoc = {
                    $set: {
                        email: email
                    }
                }
                const result = await userCollections.updateOne(filter, updatedDoc, options);
                return res.send(result);
            }
            const user = req.body;
            const result = await userCollections.insertOne(user);
            res.send(result);
        })
    }
    finally {

    }
}

run().catch(console.log)


app.get('/', async (req, res) => {
    res.send('Final project server is running')
});

app.listen(port, () => console.log(`Final project is runnig ${port}`))

