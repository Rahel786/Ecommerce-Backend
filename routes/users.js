// ============================================
// FILE: routes/users.js (UPDATED WITH RBAC)
// ============================================
const {User} = require('../models/user');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authorize_admin, authorize_user } = require('../helpers/authorize');

// ADMIN ONLY - Get all users
router.get(`/`, authorize_admin(), async (req, res) =>{
    const userList = await User.find().select('-passwordHash');

    if(!userList) {
        res.status(500).json({success: false})
    } 
    res.send(userList);
})

// USER OR ADMIN - Get single user (users can only get their own profile)
router.get('/:id', authorize_user(), async(req,res)=>{
    // Check if user is requesting their own profile or is admin
    const requestedUserId = req.params.id;
    const currentUserId = req.auth.userId;
    const isAdmin = req.auth.isAdmin;

    if (!isAdmin && requestedUserId !== currentUserId) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden - You can only access your own profile'
        });
    }

    const user = await User.findById(req.params.id).select('-passwordHash');

    if(!user) {
        res.status(500).json({message: 'The user with the given ID was not found.'})
    } 
    res.status(200).send(user);
})

// PUBLIC - Register new user
router.post('/register', async (req,res)=>{
    let user = new User({
        name: req.body.name,
        email: req.body.email,
        passwordHash: bcrypt.hashSync(req.body.password, 10),
        phone: req.body.phone,
        isAdmin: req.body.isAdmin,
        street: req.body.street,
        apartment: req.body.apartment,
        zip: req.body.zip,
        city: req.body.city,
        country: req.body.country,
    })
    user = await user.save();

    if(!user)
    return res.status(400).send('the user cannot be created!')

    res.send(user);
})

// ADMIN ONLY - Create user (admin can set isAdmin flag)
router.post('/', authorize_admin(), async (req,res)=>{
    let user = new User({
        name: req.body.name,
        email: req.body.email,
        passwordHash: bcrypt.hashSync(req.body.password, 10),
        phone: req.body.phone,
        isAdmin: req.body.isAdmin,
        street: req.body.street,
        apartment: req.body.apartment,
        zip: req.body.zip,
        city: req.body.city,
        country: req.body.country,
    })
    user = await user.save();

    if(!user)
    return res.status(400).send('the user cannot be created!')

    res.send(user);
})

// USER OR ADMIN - Update user (users can only update themselves)
router.put('/:id', authorize_user(), async (req, res)=> {
    // Check if user is updating their own profile or is admin
    const requestedUserId = req.params.id;
    const currentUserId = req.auth.userId;
    const isAdmin = req.auth.isAdmin;

    if (!isAdmin && requestedUserId !== currentUserId) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden - You can only update your own profile'
        });
    }

    const userExist = await User.findById(req.params.id);
    
    if (!userExist) {
        return res.status(404).send('User not found');
    }

    let newPassword;
    if(req.body.password) {
        newPassword = bcrypt.hashSync(req.body.password, 10)
    } else {
        newPassword = userExist.passwordHash;
    }

    // Prevent non-admins from changing isAdmin status
    const isAdminValue = isAdmin ? req.body.isAdmin : userExist.isAdmin;

    const user = await User.findByIdAndUpdate(
        req.params.id,
        {
            name: req.body.name,
            email: req.body.email,
            passwordHash: newPassword,
            phone: req.body.phone,
            isAdmin: isAdminValue,
            street: req.body.street,
            apartment: req.body.apartment,
            zip: req.body.zip,
            city: req.body.city,
            country: req.body.country,
        },
        { new: true}
    )

    if(!user)
    return res.status(400).send('the user cannot be updated!')

    res.send(user);
})

// PUBLIC - Login
router.post('/login', async (req,res) => {
    const user = await User.findOne({email: req.body.email})
    const secret = process.env.secret;
    
    if(!user) {
        return res.status(400).send('The user not found');
    }

    if(user && bcrypt.compareSync(req.body.password, user.passwordHash)) {
        const token = jwt.sign(
            {
                userId: user.id,
                isAdmin: user.isAdmin
            },
            secret,
            {expiresIn : '1d'}
        )
       
        res.status(200).send({user: user.email, token: token}) 
    } else {
       res.status(400).send('password is wrong!');
    }
})

// ADMIN ONLY - Delete user
router.delete('/:id', authorize_admin(), (req, res)=>{
    User.findByIdAndRemove(req.params.id).then(user =>{
        if(user) {
            return res.status(200).json({success: true, message: 'the user is deleted!'})
        } else {
            return res.status(404).json({success: false , message: "user not found!"})
        }
    }).catch(err=>{
       return res.status(500).json({success: false, error: err}) 
    })
})

// ADMIN ONLY - Get user count
router.get(`/get/count`, authorize_admin(), async (req, res) =>{
    const userCount = await User.countDocuments((count) => count)

    if(!userCount) {
        res.status(500).json({success: false})
    } 
    res.send({
        userCount: userCount
    });
})

module.exports = router;