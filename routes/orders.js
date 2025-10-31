// ============================================
// FILE: routes/orders.js (UPDATED WITH RBAC)
// ============================================
const {Order} = require('../models/order');
const express = require('express');
const { OrderItem } = require('../models/order-item');
const router = express.Router();
const { authorize_admin, authorize_user } = require('../helpers/authorize');

// ADMIN ONLY - Get all orders
router.get(`/`, authorize_admin(), async (req, res) =>{
    const orderList = await Order.find().populate('user', 'name').sort({'dateOrdered': -1});

    if(!orderList) {
        res.status(500).json({success: false})
    } 
    res.send(orderList);
})

// USER OR ADMIN - Get single order (users can only get their own orders)
router.get(`/:id`, authorize_user(), async (req, res) =>{
    const order = await Order.findById(req.params.id)
    .populate('user', 'name')
    .populate({ 
        path: 'orderItems', populate: {
            path : 'product', populate: 'category'} 
        });

    if(!order) {
        return res.status(404).json({success: false, message: 'Order not found'})
    }

    // Check if user is requesting their own order or is admin
    const orderUserId = order.user._id.toString();
    const currentUserId = req.auth.userId;
    const isAdmin = req.auth.isAdmin;

    if (!isAdmin && orderUserId !== currentUserId) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden - You can only access your own orders'
        });
    }
    
    res.send(order);
})

// AUTHENTICATED USER - Create order (any logged-in user)
router.post('/', authorize_user(), async (req,res)=>{
    // Ensure user can only create orders for themselves
    const currentUserId = req.auth.userId;
    const isAdmin = req.auth.isAdmin;

    // If not admin, force the order to be for the current user
    const orderUserId = isAdmin ? req.body.user : currentUserId;

    const orderItemsIds = Promise.all(req.body.orderItems.map(async (orderItem) =>{
        let newOrderItem = new OrderItem({
            quantity: orderItem.quantity,
            product: orderItem.product
        })

        newOrderItem = await newOrderItem.save();

        return newOrderItem._id;
    }))
    const orderItemsIdsResolved =  await orderItemsIds;

    const totalPrices = await Promise.all(orderItemsIdsResolved.map(async (orderItemId)=>{
        const orderItem = await OrderItem.findById(orderItemId).populate('product', 'price');
        const totalPrice = orderItem.product.price * orderItem.quantity;
        return totalPrice
    }))

    const totalPrice = totalPrices.reduce((a,b) => a +b , 0);

    let order = new Order({
        orderItems: orderItemsIdsResolved,
        shippingAddress1: req.body.shippingAddress1,
        shippingAddress2: req.body.shippingAddress2,
        city: req.body.city,
        zip: req.body.zip,
        country: req.body.country,
        phone: req.body.phone,
        status: req.body.status,
        totalPrice: totalPrice,
        user: orderUserId,
    })
    order = await order.save();

    if(!order)
    return res.status(400).send('the order cannot be created!')

    res.send(order);
})

// ADMIN ONLY - Update order status
router.put('/:id', authorize_admin(), async (req, res)=> {
    const order = await Order.findByIdAndUpdate(
        req.params.id,
        {
            status: req.body.status
        },
        { new: true}
    )

    if(!order)
    return res.status(400).send('the order cannot be updated!')

    res.send(order);
})

// ADMIN ONLY - Delete order
router.delete('/:id', authorize_admin(), async (req, res)=>{
    try {
        const order = await Order.findByIdAndRemove(req.params.id);
        
        if(order) {
            await Promise.all(
                order.orderItems.map(async orderItem => {
                    await OrderItem.findByIdAndRemove(orderItem);
                })
            );
            return res.status(200).json({success: true, message: 'the order is deleted!'});
        } else {
            return res.status(404).json({success: false , message: "order not found!"});
        }
    } catch(err) {
        return res.status(500).json({success: false, error: err});
    }
})

// ADMIN ONLY - Get total sales
router.get('/get/totalsales', authorize_admin(), async (req, res)=> {
    const totalSales= await Order.aggregate([
        { $group: { _id: null , totalsales : { $sum : '$totalPrice'}}}
    ])

    if(!totalSales) {
        return res.status(400).send('The order sales cannot be generated')
    }

    res.send({totalsales: totalSales.pop().totalsales})
})

// ADMIN ONLY - Get order count
router.get(`/get/count`, authorize_admin(), async (req, res) =>{
    const orderCount = await Order.countDocuments((count) => count)

    if(!orderCount) {
        res.status(500).json({success: false})
    } 
    res.send({
        orderCount: orderCount
    });
})

// USER OR ADMIN - Get user orders (users can only get their own)
router.get(`/get/userorders/:userid`, authorize_user(), async (req, res) =>{
    // Check if user is requesting their own orders or is admin
    const requestedUserId = req.params.userid;
    const currentUserId = req.auth.userId;
    const isAdmin = req.auth.isAdmin;

    if (!isAdmin && requestedUserId !== currentUserId) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden - You can only access your own orders'
        });
    }

    const userOrderList = await Order.find({user: req.params.userid}).populate({ 
        path: 'orderItems', populate: {
            path : 'product', populate: 'category'} 
        }).sort({'dateOrdered': -1});

    if(!userOrderList) {
        res.status(500).json({success: false})
    } 
    res.send(userOrderList);
})

module.exports = router;