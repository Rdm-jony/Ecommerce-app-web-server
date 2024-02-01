const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
require("dotenv").config()
const stripe = require('stripe')('sk_test_51M8nsMJerXZOObUu42F0E5jhKvBXhdbtGiB49T8P1Ov4q0Qmhegrv8Lmsgy5vUkfCPnXYcnTctE6h8oWj5pnVg1i0067KgMOtP');
var jwt = require('jsonwebtoken');


//middleware
app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
  res.send("Ecommerce app bloc running")
})

app.listen(port, () => {
  console.log(`Ecommerce app bloc running on ${port}`)
})

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tbsccmb.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, { serverApi: "1" });

function varifiedJwt(req, res, next) {
  const authHeader = req?.headers?.auhtorization;

  if (!authHeader) {
    return res.status(401).send({ mesage: "unathorized access" })
  }
  const token = authHeader?.split(" ")[1];
  jwt.verify(token, process.env.SECREATE_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ mesage: "unathorized access" })
    }
    req.decoded = decoded;
    next()
  })
}
async function run() {

  try {
    const userCollection = client.db("EcommerceAppBloc").collection("userCollection");
    const topProductCollection = client.db("EcommerceAppBloc").collection("TopProducts");
    const allProductsCollection = client.db("EcommerceAppBloc").collection("AllProducts");
    const addToCartCollection = client.db("EcommerceAppBloc").collection("AddCartCollection");
    const addToWishlistCollection = client.db("EcommerceAppBloc").collection("AddWishlistCollection");
    const AdsCollection = client.db("EcommerceAppBloc").collection("AdsCollection");

    app.post("/registration", async (req, res) => {
      const userInfo = req.body;
      const result = await userCollection.insertOne(userInfo);
      res.send(result);
    })

    app.get("/topProducts", async (req, res) => {
      const result = await topProductCollection.find({}).toArray();
      res.send(result);
    })
    app.get("/adsProducts", async (req, res) => {
      const result = await AdsCollection.find({}).toArray();
      res.send(result);
    })
    app.get("/productsCategory", async (req, res) => {
      const result = await allProductsCollection.distinct("category")
      res.send(result)
    })
    app.get("/allProducts", async (req, res) => {
      const categoryName = req.query.categoryName;
      if (categoryName) {
        const query = { category: categoryName }
        const result = await allProductsCollection.find(query).toArray()
        return res.send(result);
      }

      const result = await allProductsCollection.find({}).toArray()
      res.send(result);
    })


    app.get("/searchItem/:searchText", async (req, res) => {
      const text = req.params.searchText;
      const result = await allProductsCollection.find({ title: { $regex: text } }).toArray()
      res.send(result);
    })

    app.post("/addToWishList/:email", async (req, res) => {
      const email = req.params.email;
      const cartDetails = req.body;
      const isFound = await addToWishlistCollection.findOne({ email: email })
      if (isFound) {
        const findItem = isFound?.addFavourites.find(item => item._id === cartDetails._id);
        if (findItem) {
          return res.send({ msg: "Already Exist!" });
        }
        const result = await addToWishlistCollection.updateOne({ email: email }, { $push: { addFavourites: cartDetails } });
        res.send(result)
      }
      else {
        const doc = {
          email: email,
          addFavourites: [
            cartDetails
          ]
        }
        const result = await addToWishlistCollection.insertOne(doc);
        res.send(result);
      }
    })
    app.post("/addToCart/:email", async (req, res) => {
      const email = req.params.email;

      const cartDetails = req.body;
      console.log(cartDetails);
      const isFound = await addToCartCollection.findOne({ email: email })
      if (isFound) {
        const findItem = isFound?.addCarts?.find(item => item._id === cartDetails._id);
        if (findItem) {
          return res.send({ msg: "Already Exist!" });
        }
        const result = await addToCartCollection.updateOne({ email: email }, { $push: { addCarts: cartDetails } });
        res.send(result)
      }
      else {
        const doc = {
          email: email,
          addCarts: [
            cartDetails
          ]
        }
        const result = await addToCartCollection.insertOne(doc);
        res.send(result);
      }
    })
    app.get("/addToCart/:email", varifiedJwt, async (req, res) => {

      const email = req.params.email;
      if (req.decoded.email != email) {
        return res.status(403).send({ mesage: "unathorized access" })

      }
      const result = await addToCartCollection.findOne({ email: email })

      res.send(result?.addCarts);
    })

    app.get("/addToWishlist/:email", async (req, res) => {
      const email = req.params.email;
      const result = await addToWishlistCollection.findOne({ email: email })

      res.send(result?.addFavourites);
    })

    app.delete("/addToCart/:cartId", async (req, res) => {
      const cartId = req.params.cartId;
      // 6495bacb027adb46c7afa93f
      const query = {
        "addCarts._id": cartId
      }
      const findParentCollection = await addToCartCollection.findOne(query);

      const result = await addToCartCollection.updateOne({ _id: findParentCollection?._id }, {
        $pull: { addCarts: { _id: cartId } }
      });
      res.send(result);

    })

    app.delete("/addToWishlist/:cartId", async (req, res) => {
      const cartId = req.params.cartId;
      const query = {
        "addFavourites._id": cartId
      }
      const findParentCollection = await addToWishlistCollection.findOne(query);
      const result = await addToWishlistCollection.updateOne({ _id: findParentCollection?._id }, { $pull: { addFavourites: { _id: cartId } } })
      res.send(result)

    })
    app.get("/profile/:email", async (req, res) => {
      const email = req.params.email;
      const query = {
        email: email
      }
      const result = await userCollection.findOne(query);
      res.send(result)
    })
    app.post("/profile/:email", async (req, res) => {
      const email = req.params.email;
      const updateData = req.body;
      let updateDoc;
      const query = {
        email: email
      }
      const options = { upsert: true };
      if (updateData.image) {
        updateDoc = {
          $set: {
            image: updateData?.image
          },
        };
      }
      else if (updateData.gender) {
        updateDoc = {
          $set: {
            gender: updateData?.gender
          },
        };
      }
      else if (updateData?.name) {
        updateDoc = {
          $set: {
            name: updateData?.name
          },
        };
      }
      else if (updateData?.birthDate) {
        updateDoc = {
          $set: {
            birthDate: updateData?.birthDate
          },
        };
      }
      else if (updateData?.number) {
        updateDoc = {
          $set: {
            number: updateData?.number
          },
        };
      }

      const result = await userCollection.updateOne(query, updateDoc, options);
      res.send(result);
    })

    app.post('/create-checkout-session/:email', async (req, res) => {
      const email = req.params.email;
      const cartDetails = req.body;

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            email: cartDetails.email,
            price_data: {

              "currency": "usd",
              product_data: {
                name: cartDetails.title
              },
              "unit_amount": cartDetails.price * 100,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: 'https://flutterecommercebloc.web.app/#/addToCart',
        cancel_url: 'https://flutterecommercebloc.web.app/#/cancel',
      });
      session["productId"] = cartDetails._id;
      session.customer_email = email;
      res.send(session)

    });


    app.put("/updatePayment/:cartId", async (req, res) => {
      const id = req.params.cartId;
      const email = req.body.email;
      console.log(req.body)
      const query = {
        email: email
      }
      const findParentCollection = await addToCartCollection.findOne(query);

      const result = await addToCartCollection.updateOne({ email: email, "addCarts._id": id }, { $set: { "addCarts.$.paid": true } }, { upsert: true }
      );


      res.send(result);
    })

    app.post("/addProduct", async (req, res) => {
      const formData = req.body;
      const result = await allProductsCollection.insertOne(formData);
      res.send(result)
    })

    app.post("/topProduct", async (req, res) => {
      const cartDetails = req.body;
      const id = cartDetails._id;
      console.log(cartDetails._id);
      const query = {
        _id: new ObjectId(id)
      }
      const updateDoc = {
        $set: {
          top: true
        }
      }
      const updateAds = await allProductsCollection.updateOne(query, updateDoc, { upsert: true });
      if (updateAds.acknowledged) {
        cartDetails.ads = true;
        const result = await topProductCollection.insertOne(cartDetails);
        res.send(result)
      }
      // const result=await AdsCollection.insertOne(cartDetails);

    })
    app.post("/adsProduct", async (req, res) => {
      const cartDetails = req.body;
      const id = cartDetails._id;
      console.log(cartDetails._id);
      const query = {
        _id: new ObjectId(id)
      }
      const updateDoc = {
        $set: {
          ads: true
        }
      }
      const updateAds = await allProductsCollection.updateOne(query, updateDoc, { upsert: true });
      if (updateAds.acknowledged) {
        cartDetails.ads = true;
        const result = await AdsCollection.insertOne(cartDetails);
        res.send(result)
      }
      // const result=await AdsCollection.insertOne(cartDetails);

    })
    app.delete("/adsProduct/:cartId", async (req, res) => {
      const cartId = req.params.cartId;
      const updateAds = await allProductsCollection.updateOne({ _id: new ObjectId(cartId) }, {
        $set: {
          ads: false
        }
      }, { upsert: true });
      if (updateAds.acknowledged) {
        const deleteAds = await AdsCollection.deleteOne({ _id: cartId });
        res.send(deleteAds)
      }
    });

    app.delete("/topProduct/:cartId", async (req, res) => {
      const cartId = req.params.cartId;
      const updateAds = await allProductsCollection.updateOne({ _id: new ObjectId(cartId) }, {
        $set: {
          top: false
        }
      }, { upsert: true });
      if (updateAds.acknowledged) {
        const deleteAds = await topProductCollection.deleteOne({ _id: cartId });
        res.send(deleteAds)
      }
    });
    app.delete("/allProduct/:cartId", async (req, res) => {
      const id = req.params.cartId;
      const deleteFromAllProduct = await allProductsCollection.deleteOne({ _id: new ObjectId(id) });

      const deleteFromAds = await AdsCollection.deleteOne({ _id: id })
      const deleteFromTop = await topProductCollection.deleteOne({ _id: id })
      res.send(deleteFromAllProduct);
    })

    app.post("/jwt", async (req, res) => {
      const email = req.body.email
      var token = jwt.sign({ email }, process.env.SECREATE_TOKEN);
      res.send({ token });


    })
    app.get("/user/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = {
        email: email
      }
      const result = await userCollection.findOne(query)
      if (result?.role == "admin") {
        return res.send({ isAdmin: true })
      }
      return res.send({ isAdmin: false })
    })

    app.get("/allUsers", async (req, res) => {
      const result = await userCollection.find({}).toArray();
      res.send(result);
    })
    app.put("/allUsers/:email", async (req, res) => {
      const email = req.params.email;
      const role = req.body.role;
      console.log(req.body);
      const query = {
        email: email
      }
      const updateDoc = {
        $set: {
          role: role
        }
      }
      const result = await userCollection.updateOne(query, updateDoc, { upsert: true });
      console.log(result);
      res.send(result)
    })


  } finally {
    // Ensures that the client will close when you finish/error

  }
}
run().catch(console.dir);



