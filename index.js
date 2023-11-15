const express = require('express');
const cors = require('cors');

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

const app = express();
const port = process.env.PORT || 5000;


// middleware 
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    try{
        res.send('Server is running');
    }catch(err){
        console.log(err.message);
    }
})

app.listen(port, () => {
    try{
        console.log('Server is running on port :', port);
    }catch(err){
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


        // get all menus public API
        app.get('/menus', async(req, res) => {
            try{
                const result = await menuCollection.find().toArray();
                res.send(result);
            }catch(err){
                console.log(err.message)
            }
        })
        // get all menus public API end



        // get all reviews public API
        app.get('/reviews', async(req, res) => {
            try{
                const result = await reviewCollection.find().toArray();
                res.send(result);
            }catch(err){
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
                const query = { cartItemUser : useremail}
                const result = await cartCollection.find(query).toArray();
                res.send(result);
            } catch (err) {
                console.log(err.message)
            }
        })
        // get carts items for a user end

        // Delete a cart item 
        app.get('/user/delete-cart/:id', async (req, res) => {
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





        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.log);

