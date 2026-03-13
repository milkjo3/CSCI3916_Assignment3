const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const authJwtController = require('./auth_jwt'); // You're not using authController, consider removing it
const jwt = require('jsonwebtoken');
const cors = require('cors');
const User = require('./Users');
const Movie = require('./Movies'); // You're not using Movie, consider removing it
const { Query } = require('mongoose');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

const router = express.Router();


router.post('/signup', async (req, res) => { // Use async/await
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({ success: false, msg: 'Please include both username and password to signup.' }); // 400 Bad Request
  }

  try {
    const user = new User({ // Create user directly with the data
      name: req.body.name,
      username: req.body.username,
      password: req.body.password,
    });

    await user.save(); // Use await with user.save()

    res.status(201).json({ success: true, msg: 'Successfully created new user.' }); // 201 Created
  } catch (err) {
    if (err.code === 11000) { // Strict equality check (===)
      return res.status(409).json({ success: false, message: 'A user with that username already exists.' }); // 409 Conflict
    } else {
      console.error(err); // Log the error for debugging
      return res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' }); // 500 Internal Server Error
    }
  }
});


router.post('/signin', async (req, res) => { // Use async/await
  try {
    const user = await User.findOne({ username: req.body.username }).select('name username password');

    if (!user) {
      return res.status(401).json({ success: false, msg: 'Authentication failed. User not found.' }); // 401 Unauthorized
    }

    const isMatch = await user.comparePassword(req.body.password); // Use await

    if (isMatch) {
      const userToken = { id: user._id, username: user.username }; // Use user._id (standard Mongoose)
      const token = jwt.sign(userToken, process.env.SECRET_KEY, { expiresIn: '1h' }); // Add expiry to the token (e.g., 1 hour)
      res.json({ success: true, token: 'JWT ' + token });
    } else {
      res.status(401).json({ success: false, msg: 'Authentication failed. Incorrect password.' }); // 401 Unauthorized
    }
  } catch (err) {
    console.error(err); // Log the error
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' }); // 500 Internal Server Error
  }
});


router.route('/movies')
    // Return list of all movies.
    .get(authJwtController.isAuthenticated, async (req, res) => {
      try {
        const movies = await Movie.find();
        if (movies.length === 0){
          return res.status(204).json({success: true, message: 'Successful request, no movies to be fetched.'});
        }
        return res.status(200).json({success: true, message: 'Successfully fetched all movies.', movie_list : movies});
      }
      catch (err){
        console.log(err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
      }
    })

    // 
    .post(authJwtController.isAuthenticated, async (req, res) => {
      try {
        if (!req.body.title) {
          return res.status(400).json({ success: false, msg: 'Cannot POST movie, missing required field: title' }); // 400 Bad Request
        }
        const genres = Movie.schema.path("genre").enumValues;
        const movie = new Movie({
          title: req.body.title,
          releaseDate: req.body.releaseDate? req.body.releaseDate : undefined,
          genre: genres.includes(req.body.genre) && typeof req.body.genre === "string" ? req.body.genre : undefined,
          actors: req.body.actors ? req.body.actors : undefined
        });

        await movie.save();

        res.status(201).json({ success: true, msg: 'Successfully created new movie.' });
      }
      catch (err){
        console.log(err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
      }
    })
    .put(async (req, res) => {
        return res.status(500).json({sucess: false, message: 'PUT request not supported.'});
    })
    .delete(async (req, res) => {
        return res.status(500).json({sucess: false, message: 'DELETE request not supported.'});
    });


router.route('/movies/:title')
    // Return movie based on title.
    .get(authJwtController.isAuthenticated, async (req, res) => {
      try {
        const movie = await Movie.findOne({title: req.params.title});
        if (!movie){
          return res.status(204).json();
        }
        return res.status(200).json({success: true, message: 'Successfully fetched movie.', movie : movie});
      }
      
      catch (err){
        console.log(err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
      }
    })

    
    .post(authJwtController.isAuthenticated, async (req, res) => {
      return res.status(500).json({sucess: false, message: 'POST request not supported.'});
    })


    .put(authJwtController.isAuthenticated, async (req, res) => {
      try {
        
      }

      catch (err) {
        console.log(err);
        return res.status(500).json({sucess: false, message: 'Internal server error.'});
      }
    })


    .delete(authJwtController.isAuthenticated, async (req, res) => {
      try {
        const movie = await Movie.findOne({title: req.params.title});
        if (!movie){
          return res.status(404).json({success : false, message : 'DELETE failed, resource cannot be found.', resource: `${req.params.title}`});
        }

        const resource = await Movie.deleteOne({title : req.params.title});
        if (resource.deletedCount === 1){
          return res.status(200).json({success : true, message: 'Resource deleted successfully.'});
        }
        else {
          return res.status(500).json({success : false, message: 'Resource could not be deleted.', resource: `${req.params.title}`});
        }
      }

      catch (err) {
        console.log(err);
        return res.status(500).json({success: false, message: 'Internal server error.'});
      }
    });

app.use('/', router);

const PORT = process.env.PORT || 8080; // Define PORT before using it
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app; // for testing only