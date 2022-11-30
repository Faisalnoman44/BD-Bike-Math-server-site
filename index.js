const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken')



const app = express()
const port = process.env.PORT || 5000;


app.use(cors())
app.use(express.json())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.c0svav3.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function veifyJWT(req, res, next) {
    const authHeader = req.headers.athorization;
    console.log(authHeader)
    if (!authHeader) {
        return res.status(401).send('unauthorize access')
    }
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next()
    })
}



async function run() {
    try {
        const bikeCollections = client.db('bdBikeMath').collection('bikeCollections');
        const userCollections = client.db('bdBikeMath').collection('users');
        const bookingCollections = client.db('bdBikeMath').collection('bookings');


        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail }
            const user = await userCollections.findOne(query)
            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();

        }

        const verifySeller = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail }
            const user = await userCollections.findOne(query)
            if (user.userCategory !== 'Seller') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();

        }

        // bike 

        app.get('/bikes/:brand', async (req, res) => {
            const brand = req.params.brand
            const query = { brand: brand }
            const bikes = await bikeCollections.find(query).toArray();
            res.send(bikes);
        })

        app.get('/bikes/reportedItem', async (req, res) => {
            const query = { isReported: 'reported' };
            const reportedBike = await bikeCollections.findOne(query)
            res.send(reportedBike)
        })

        app.get('/bikes/myorders/:email',veifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const myProducts = await bikeCollections.find(query).toArray();
            res.send(myProducts);
        })

        app.post('/bikes',veifyJWT, verifySeller, async (req, res) => {
            const bike = req.body;
            const result = await bikeCollections.insertOne(bike);
            res.send(result)
        })

        app.put('/bikes/reported/:id',veifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    isReported: 'reported'
                }
            }
            const result = await bikeCollections.updateOne(filter, updatedDoc, options);
            res.send(result);

        })

        app.put('/bikes/:id',veifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    status: 'booked'
                }
            }
            const result = await bikeCollections.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        app.put('/bikes/verify/:email', async (req, res) => {
            const email = req.params.email;
            const filter = {email: email };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    isVerified: 'verified'
                }
            }
            const result = await bikeCollections.updateMany(filter, updatedDoc, options);
            res.send(result);

        })

        app.delete('/bikes/:id', veifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await bikeCollections.deleteOne(filter);
            res.send(result);
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

        app.get('/users/buyer', veifyJWT, verifyAdmin, async (req, res) => {
            const query = { userCategory: 'Buyer' };
            const users = await userCollections.find(query).toArray();
            res.send(users)
        })
        app.get('/users/seller', veifyJWT, verifyAdmin, async (req, res) => {
            const query = { userCategory: 'Seller' };
            const users = await userCollections.find(query).toArray();
            res.send(users)
        })

        app.get('/users/:email', veifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const orders = await bookingCollections.find(query).toArray();
            res.send(orders)
        })


        app.get('/users/admin/:email',veifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await userCollections.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        });


        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await userCollections.findOne(query);
            res.send({ isSeller: user?.userCategory === 'Seller' });
        });


        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await userCollections.findOne(query);
            res.send({ isBuyer: user?.userCategory === 'Buyer' });
        });


        app.post('/users', async (req, res) => {
            const email = req.body.email;
            const query = { email: email }
            const alreadyExist = await userCollections.findOne(query)
            if (alreadyExist) {
                const filter = { email: email }
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

        // app.put('/users/admin/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const filter = { _id: ObjectId(id) };
        //     const options = { upsert: true };
        //     const updatedDoc = {
        //         $set: {
        //             role: 'admin'
        //         }
        //     }
        //     const result = await userCollections.updateOne(filter, updatedDoc, options);
        //     res.send(result);


        // });

        app.put('/users/verify/:id', veifyJWT,verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    isVerified: 'verified'
                }
            }
            const result = await userCollections.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await userCollections.deleteOne(filter);
            res.send(result);
        })


        // bookings 

        app.get('/bookings/:id' , async(req, res) =>{
            const id = req.params.id;
            const query = {_id : ObjectId(id)};
            const result = await bookingCollections.findOne(query);
            res.send(result)
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingCollections.insertOne(booking);
            res.send(result)
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

