const express = require('express');
const cors = require('cors');
const { default: mongoose } = require('mongoose');
const app = express();
const User = require('./models/User')
const Post = require('./models/Post')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const multer = require('multer')
const uploadMiddleware = multer({dest: 'uploads/'})
const fs = require('fs')

const salt = bcrypt.genSaltSync(10);
const secret = 'fdahiuho7hkjgr6hkj08hihu4hlksf';
app.use(cors({credentials:true,origin:'http://localhost:3002'}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads',express.static(__dirname + '/uploads'))

mongoose.connect('mongodb+srv://bloghub:VlZvFGZ7Nz8sU37A@cluster0.dxre8ho.mongodb.net/?retryWrites=true&w=majority')
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// api for register
app.post('/register',async(req,res) => {
    const {username,password} = req.body;
    try{

        const userDoc = await User.create({
            username,password:bcrypt.hashSync(password,salt)
        })
        res.json({userDoc})
    } catch(e) {
        res.status(400).json(e);
    }

})


// api for logins
// app.post('/login',async(req,res) => { 
//     const{username,password} = req.body;
//     const userDoc = await User.findOne({username}); 
//     const passOk = bcrypt.compareSync(password,userDoc.password)
//     if (!userDoc) {
//         return res.status(400).json('User not found'); // Handle case when user is not found
//       }
//     if(passOk){
//         // logged in
//         jwt.sign({username,id:userDoc._id} , secret , {} , (err,token) =>{
//             if (err) throw err;
//             res.cookie('token', token).json('ok');
//         })
        
//     }
//     else{
//         res.status(400).json('wrong credentials')
//     }
// })

// api for login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Log the request body
    // console.log('Login request:', { username, password });

    try {
        const userDoc = await User.findOne({ username });

        if (!userDoc) {
            return res.status(400).json('User not found'); // Handle case when user is not found
        }

        if (!userDoc.password) {
            return res.status(500).json('User password is missing'); // Handle case when userDoc doesn't have a password
        }

        const passOk = bcrypt.compareSync(password, userDoc.password);

        if (passOk) {
            // logged in
            jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
                if (err) throw err;
                res.cookie('token', token).json({id:userDoc._id,username});
            });
        } else {
            res.status(400).json('Password is wrong'); // Handle case when password is incorrect
        }
    } catch (error) {
        // console.error('Error during login:', error);
        res.status(500).json('Internal Server Error');
    } 
});


// get profile
app.get('/profile',(req,res) => {
    const {token} = req.cookies;
    jwt.verify(token, secret , {} , (err,info) => {
        if(err) throw err;
        res.json(info);
    })
    res.json(req.cookies)
}
)

// logout
app.post('/logout',(req,res) => {
    res.cookie('token', '').json('ok');
})

// api for create post
app.post('/post',uploadMiddleware.single('file'),async(req,res) => {
    const {originalname,path } = req.file;
    // res.json({files:req.file})
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    const newPath = path+ '.'+ext;
    fs.renameSync(path, newPath);

    const {token} = req.cookies;
    jwt.verify(token, secret , {} , async(err,info) => {
        if(err) throw err;
        const{title,summary,content} = req.body;
        const postDoc = await Post.create({
            title,
            summary,
            content,
            cover:newPath,
            author:info.id,
        })
        res.json(postDoc);
    })
 
 

})

// edit post
app.put('/post',uploadMiddleware.single('file'), async (req,res) => {

    let newPath = null;
    if(req.file){
        const {originalname,path } = req.file;
        // res.json({files:req.file})
        const parts = originalname.split('.');
        const ext = parts[parts.length - 1];
        newPath = path+ '.'+ext;
        fs.renameSync(path, newPath);
    }

    const {token} = req.cookies;
    jwt.verify(token, secret , {} , async(err,info) => {
        if(err) throw err;
        const{id,title,summary,content} = req.body;
        const postDoc = await Post.findById(id);
        const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);

        if(!isAuthor) {
            return res.status(400).json('you are not the atuhor');
        }
        await postDoc.updateOne({
            title,
            summary,
            content,
            cover:newPath ? newPath : postDoc.cover,
        })
  
        res.json(postDoc); 
    })

})

// api to get all post 
app.get('/post',async(req,res) => {

    res.json(await Post.find().populate('author', ['username']));
})

// api to get single post
app.get('/post/:id', async(req,res) => {
    const {id} = req.params;
    const postDoc = await Post.findById(id).populate('author',['username']);
    res.json(postDoc);
})

    

app.listen(4000);  
   
