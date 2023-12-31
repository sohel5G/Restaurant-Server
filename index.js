const express = require('express');
const cors = require('cors');
var jwt = require('jsonwebtoken');

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY_TEST);

const app = express();
const port = process.env.PORT || 5000;


// middleware 
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    try {
        res.send('Server is running');
    } catch (err) {
        console.log(err.message);
    }
})

app.listen(port, () => {
    try {
        console.log('Server is running on port :', port);
    } catch (err) {
        console.log(err.message);
    }
})




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qbl5b3c.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // await client.connect();

        const menuCollection = client.db('restaurant').collection('menu');
        const reviewCollection = client.db('restaurant').collection('reviews');
        const cartCollection = client.db('restaurant').collection('carts');
        const userCollection = client.db('restaurant').collection('users');
        const paymentDoneCollection = client.db('restaurant').collection('paymentdone');


        // ----------- JWT ACCESS TOKEN API ---------------------
        app.post('/jwt', (req, res) => {
            try {
                const userEmail = req.body;
                const token = jwt.sign(userEmail, process.env.SECRET_TOKEN, { expiresIn: '1h' });
                res.send({ token });
            } catch (err) {
                console.log(err.message);
            }
        })

        const verifyToken = (req, res, next) => {

            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'Unauthorized access' });
            }

            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'Unauthorized access' });
                }

                req.decoded = decoded
                next();
            })
        }

        // we need to use verifyAdmin after verifyToken 
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;

            const query = { email: email };
            const user = await userCollection.findOne(query);

            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            next();
        }

        // ----------- JWT ACCESS TOKEN API END------------------







        // -----------  STRIPE PAYMENT METHOD API------------------
        app.post('/create-stripe-payment-intent', async (req, res) => {
            try {
                const { price } = req.body;
                const amount = parseInt(price * 100);

                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amount,
                    currency: 'usd',
                    payment_method_types: ['card']
                });

                res.send({
                    clientSecret: paymentIntent.client_secret
                })

            } catch (err) {
                console.log(err.message)
            }

        })
        // -----------  STRIPE PAYMENT METHOD API------------------


        // -----------  POST ITEMS AFTER PAYMENT DONE------------------
        app.post('/payment-done', async (req, res) => {
            try {

                const newPayment = req.body;
                const paymentResult = await paymentDoneCollection.insertOne(newPayment);

                const query = {
                    _id: {
                        $in: newPayment.cartIds.map(id => new ObjectId(id))
                    }
                }
                const deleteResult = await cartCollection.deleteMany(query);

                res.send({ paymentResult, deleteResult });

            } catch (err) {
                console.log(err);
            }
        })
        // -----------  POST ITEMS AFTER PAYMENT DONE END------------------






        // Get all purchased item on reservation page
        app.get('/my-reservation/:userEmail', async (req, res) => {
            try {

                const query = { userEmail: req.params.userEmail }

                // if (req.params.userEmail !== req.decoded.email) {
                //     return res.status(403).send({ message: 'forbidden access' });
                // }

                const result = await paymentDoneCollection.find(query).toArray();
                res.send(result);

            } catch (err) {
                console.log(err.message)
            }
        })
        // Get all purchased item on reservation page end





        // Admin dashboard Statistic page API
        app.get('/admin-stats', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const users = await userCollection.estimatedDocumentCount();
                const menuItems = await menuCollection.estimatedDocumentCount();
                const orders = await paymentDoneCollection.estimatedDocumentCount();

                // // this is not best way to get revenue
                // const payments = await paymentDoneCollection.find().toArray();
                // const revenue = payments.reduce((total, item) => total + item.totalPrice ,0);

                // this is the best way to get revenue
                const result = await paymentDoneCollection.aggregate([
                    {
                        $group: {
                            _id: null,
                            totalRevenue: {
                                $sum: '$totalPrice'
                            }
                        }
                    }
                ]).toArray();

                const revenue = result.length > 0 ? result[0].totalRevenue : 0;


                res.send({
                    users,
                    menuItems,
                    orders,
                    revenue,
                });

            } catch (error) {
                console.log(error);
            }
        })

        //aggregate pipeline
        app.get('/order-stats', verifyToken, verifyAdmin, async (req, res) => {
            try{
                const result = await paymentDoneCollection.aggregate([
                    {
                        $unwind: '$cartItemIds'
                    },
                    {
                        $lookup: {
                            from: 'menu',
                            localField: 'cartItemIds',
                            foreignField: '_id',
                            as: 'cartItems'
                        }
                    },

                    {
                        $unwind: '$cartItems'
                    },
                    {
                        $group: {
                            _id: '$cartItems.category',
                            quantity: { $sum: 1 },
                            revenue: { $sum: '$cartItems.price'}
                        }
                    },
                    
                    {
                        $project: {
                            _id: 0,
                            category: '$_id',
                            quantity: '$quantity',
                            revenue: '$revenue'
                        }
                    }

                ]).toArray();

                res.send(result);
            
            }catch(error){
                console.log(error)
            }
        })

        // Admin dashboard Statistic page API END






        // Add menu item 
        app.post('/admin/add-item', verifyToken, verifyAdmin, async (req, res) => {
            try {

                const menuItem = req.body;
                const result = await menuCollection.insertOne(menuItem);
                res.send(result);

            } catch (err) {
                console.log(err.message)
            }
        })
        // Add menu item end



        // get all menus public API
        app.get('/menus', async (req, res) => {
            try {
                const result = await menuCollection.find().toArray();
                res.send(result);
            } catch (err) {
                console.log(err.message)
            }
        })
        // get all menus public API end


        // Delete a menu item 
        app.delete('/admin/delete-item/:id', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const itemId = req.params.id;
                const query = { _id: new ObjectId(itemId) }
                const result = await menuCollection.deleteOne(query);
                res.send(result);
            } catch (err) {
                console.log(err.message)
            }
        })
        // Delete a menu item end




        // get all reviews public API
        app.get('/reviews', async (req, res) => {
            try {
                const result = await reviewCollection.find().toArray();
                res.send(result);
            } catch (err) {
                console.log(err.message)
            }
        })
        // get all reviews public API end



        // Post a cart item 
        app.post('/user/add-cart', async (req, res) => {
            try {
                const cartItem = req.body;
                const result = await cartCollection.insertOne(cartItem);
                res.send(result);
            } catch (err) {
                console.log(err.message)
            }
        })
        // Post a cart item  end



        // get carts items for a user 
        app.get('/carts', async (req, res) => {
            try {
                const useremail = req.query.useremail;
                const query = { cartItemUser: useremail }
                const result = await cartCollection.find(query).toArray();
                res.send(result);
            } catch (err) {
                console.log(err.message)
            }
        })
        // get carts items for a user end


        // Delete a cart item 
        app.delete('/user/delete-cart/:id', async (req, res) => {
            try {
                const itemId = req.params.id;
                const query = { _id: new ObjectId(itemId) }
                const result = await cartCollection.deleteOne(query);
                res.send(result);
            } catch (err) {
                console.log(err.message)
            }
        })
        // Delete a cart item end


        // Store a user 
        app.post('/store-users', async (req, res) => {
            try {
                const newUser = req.body;

                const query = { email: newUser.email };
                const existingUser = await userCollection.findOne(query);
                if (existingUser) {
                    return res.send({ message: 'user already exists', insertedId: null });
                }

                const result = await userCollection.insertOne(newUser);
                res.send(result)
            } catch (err) {
                console.log(err.message)
            }
        })
        //Store a user end


        // Get All users
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })
        // Get All users End


        // make Admin a user
        app.patch('/users/make-admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const itemId = req.params.id;
            const query = { _id: new ObjectId(itemId) };

            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }

            const result = await userCollection.updateOne(query, updatedDoc);
            res.send(result);
        })
        // make Admin a user end



        // verify use if isAdmin or not 

        app.get('/users/isadmin/:email', verifyToken, async (req, res) => {
            try {
                const email = req.params.email;

                if (email !== req.decoded.email) {
                    return res.status(403).send({ message: 'forbidden access' })
                }

                const query = { email: email };
                const user = await userCollection.findOne(query)

                let admin = false;
                if (user) {
                    admin = user?.role === 'admin';
                }
                res.send({ admin });


            } catch (err) {
                console.log(err.message)
            }
        })

        // verify use if isAdmin or not End



        // Delete a user 
        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const itemId = req.params.id;
                const query = { _id: new ObjectId(itemId) }
                const result = await userCollection.deleteOne(query);
                res.send(result);
            } catch (err) {
                console.log(err.message)
            }
        })
        // Delete a user end



        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.log);

