const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

const transactionRoutes = require("./routes/transactionRoutes");
app.use("/api/transactions", transactionRoutes);


mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

app.use(express.json());

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
