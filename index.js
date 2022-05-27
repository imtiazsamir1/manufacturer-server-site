const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const res = require("express/lib/response");
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hjhzw.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const partCollection = client.db("bike_parts").collection("parts");
    const reviewCollection = client.db("bike_review").collection("review");
    const userCollection = client.db("parts_user").collection("user");
    const payCollection = client.db("parts_pay").collection("payment");
    const orderCollection = client.db("parts_order").collection("orders");

    function verifyJWT(req, res, next) {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).send({ message: "UnAuthorized access" });
      }
      const token = authHeader.split(" ")[1];
      jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET,
        function (err, decoded) {
          if (err) {
            return res.status(403).send({ message: "Forbidden access" });
          }
          req.decoded = decoded;
          next();
        }
      );
    }

    app.get("/part", async (req, res) => {
      const query = {};
      const cursor = partCollection.find(query);
      const parts = await cursor.toArray();
      res.send(parts);
    });
    app.get("/orders", async (req, res) => {
      const query = {};
      const result = await orderCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/parts", async (req, res) => {
      const query = {};
      const result = await partCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/parts", async (req, res) => {
      const parts = req.body;
      const result = await partCollection.insertOne(parts);
      res.send(result);
    });
    app.get("/part/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const part = await partCollection.findOne(query);
      res.send(part);
    });
    app.delete("/part/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await partCollection.deleteOne(query);
      res.send(result);
    });
    app.get("/parts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };

      const result = await partCollection.findOne(query);
      res.send(result);
    });
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ result, token });
    });
    app.get("/all-user", async (req, res) => {
      const query = {};
      console.log("hiited");
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });
    app.delete("/user/:userId", async (req, res) => {
      const userId = req.params.userId;
      console.log(userId);
      const query = { _id: ObjectId(userId) };
      const result = await userCollection.deleteOne(query);
      console.log(result);
      res.send(result);
    });
    app.put("/user/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAcc = await userCollection.findOne({ email: requester });
      if (requesterAcc.role === "admin") {
        const filter = { email: email };

        const updateDoc = {
          $set: { role: "admin" },
        };

        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      } else {
        res.status(403).send({ message: "Forbbiden" });
      }
    });
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });
    app.post("/review", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });
    app.get("/review", async (req, res) => {
      const query = {};
      const cursor = await reviewCollection.find(query).toArray();

      res.send(cursor);
    });

    app.put("/order/:id", async (req, res) => {
      const id = req.params.id;
      const payment = req.body;

      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: payment,
      };

      const result = await orderCollection.updateOne(filter, updateDoc);

      res.send(result);
    });
    app.put("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.body;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: status,
      };
      const result = await orderCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.delete("/order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });
    app.post("/order", async (req, res) => {
      const order = req.body;

      const result = await orderCollection.insertOne(order);
      res.send(result);
    });
    app.get("/order", async (req, res) => {
      const email = req.query.email;

      const decodedEmail = req.decoded?.email(decodedEmail === email);
      const query = { email: email };
      const result = await orderCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/payment", async (req, res) => {
      const payment = req.body;
      const result = await payCollection.insertOne(payment);
      res.send(result);
    });
    app.post("/create-payment-intent", verifyToken, async (req, res) => {
      const service = req.body;
      const price = await service.price;
      const amount = price * 100;

      if (amount) {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });

        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } else {
        res.send("Something wrong");
      }
    });
    app.put("/parts/:id", async (req, res) => {
      const doc = req.body;
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: doc,
      };

      const result = await carPartsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from bangle!");
});

app.listen(port, () => {
  console.log(`Bangle app listening on port ${port}`);
});
