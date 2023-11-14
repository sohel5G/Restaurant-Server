const express = require('express');
const cors = require('cors');

const { MongoClient, ServerApiVersion } = require('mongodb');
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










        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.log);

