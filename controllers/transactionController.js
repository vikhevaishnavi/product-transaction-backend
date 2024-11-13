const axios = require("axios");
const Transaction = require("../models/Transaction");

exports.initializeDatabase = async (req, res) => {
    try {
        const response = await axios.get("https://s3.amazonaws.com/roxiler.com/product_transaction.json");
        await Transaction.deleteMany({});
        await Transaction.insertMany(response.data);
        res.status(200).json({ message: "Database initialized with seed data" });
    } catch (error) {
        res.status(500).json({ message: "Failed to initialize database", error });
    }
};


exports.listTransactions = async (req, res) => {
    const { page = 1, perPage = 10, search = "", month } = req.query;
    const skip = (page - 1) * perPage;
    const regex = new RegExp(search, "i");

    const query = {
        dateOfSale: { $regex: `-${month.padStart(2, '0')}-`, $options: 'i' },
        $or: [{ title: regex }, { description: regex }, { price: regex }]
    };

    const transactions = await Transaction.find(query).skip(skip).limit(Number(perPage));
    res.status(200).json(transactions);
};


exports.getStatistics = async (req, res) => {
    const { month } = req.query;

    const soldItems = await Transaction.countDocuments({
        dateOfSale: { $regex: `-${month.padStart(2, '0')}-`, $options: 'i' },
        sold: true
    });

    const notSoldItems = await Transaction.countDocuments({
        dateOfSale: { $regex: `-${month.padStart(2, '0')}-`, $options: 'i' },
        sold: false
    });

    const totalSaleAmount = await Transaction.aggregate([
        { $match: { dateOfSale: { $regex: `-${month.padStart(2, '0')}-`, $options: 'i' }, sold: true } },
        { $group: { _id: null, total: { $sum: "$price" } } }
    ]);

    res.status(200).json({
        totalSaleAmount: totalSaleAmount[0]?.total || 0,
        soldItems,
        notSoldItems
    });
};


exports.getBarChartData = async (req, res) => {
    const { month } = req.query;
    const priceRanges = [
        [0, 100], [101, 200], [201, 300], [301, 400],
        [401, 500], [501, 600], [601, 700], [701, 800],
        [801, 900], [901, Infinity]
    ];

    const barChartData = await Promise.all(priceRanges.map(async ([min, max]) => {
        const count = await Transaction.countDocuments({
            dateOfSale: { $regex: `-${month.padStart(2, '0')}-`, $options: 'i' },
            price: { $gte: min, $lt: max }
        });
        return { range: `${min}-${max === Infinity ? "above" : max}`, count };
    }));

    res.status(200).json(barChartData);
};


exports.getPieChartData = async (req, res) => {
    const { month } = req.query;
    const categories = await Transaction.aggregate([
        { $match: { dateOfSale: { $regex: `-${month.padStart(2, '0')}-`, $options: 'i' } } },
        { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    res.status(200).json(categories);
};


exports.getCombinedData = async (req, res) => {
    const [transactions, statistics, barChartData, pieChartData] = await Promise.all([
        listTransactions(req, res),
        getStatistics(req, res),
        getBarChartData(req, res),
        getPieChartData(req, res)
    ]);

    res.status(200).json({
        transactions,
        statistics,
        barChartData,
        pieChartData
    });
};
