/**
 * Project 2 Express server connected to MongoDB 'project2'.
 * Start with: node webServer.js
 * Client uses axios to call these endpoints.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import mongoose from "mongoose";
// eslint-disable-next-line import/no-extraneous-dependencies
import bluebird from "bluebird";
import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import multer from "multer";
import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import http from "http";
import { Server } from "socket.io";

// ToDO - Your submission should work without this line. Comment out or delete this line for tests and before submission!
//import models from "./modelData/photoApp.js";

// Load the Mongoose schema for User, Photo, and SchemaInfo
// ToDO - Your submission will use code below, so make sure to uncomment this line for tests and before submission!
import User from "./schema/user.js";
import Photo from "./schema/photo.js";
import SchemaInfo from "./schema/schemaInfo.js";

const portno = 3001; // Port number to use
const app = express();

// Create HTTP server and Socket.io server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  }
});

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);
  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
  });
});

// Enable CORS for all routes
// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

mongoose.Promise = bluebird;
mongoose.set("strictQuery", false);
mongoose.connect("mongodb://127.0.0.1/project3", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// We have the express static module
// (http://expressjs.com/en/starter/static-files.html) do all the work for us.
app.use(express.static(__dirname));



app.use(session({ secret: "secretKey", resave: false, saveUninitialized: false }));
app.use(bodyParser.json());

/**
 * URL /admin/login - Login user
 */
app.post("/admin/login", async (request, response) => {
  const { login_name, password } = request.body;
  try {
    const user = await User.findOne({ login_name });
    if (!user) {
      response.status(400).send({ error: "Login failed" });
      return;
    }

    if (password !== user.password) {
      response.status(400).send({ error: "Login failed" });
      return;
    }

    request.session.user_id = user._id;
    request.session.login_name = user.login_name;
    // request.session.cookie.maxAge = 60000; // Optional: Session expires in 1 minute

    response.status(200).send({
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      login_name: user.login_name,
    });
  } catch (err) {
    console.error("/admin/login error:", err);
    response.status(500).send({ error: "Server error during login" });
  }
});

/**
 * URL /user - Register a new user.
 */
app.post("/user", async (request, response) => {
  const {
    login_name,
    password,
    first_name,
    last_name,
    location,
    description,
    occupation,
  } = request.body;

  if (!login_name || !password || !first_name || !last_name) {
    response.status(400).send({ error: "Missing required fields" });
    return;
  }

  try {
    const existingUser = await User.findOne({ login_name });
    if (existingUser) {
      response.status(400).send({ error: "Login name already exists" });
      return;
    }

    const newUser = new User({
      login_name,
      password,
      first_name,
      last_name,
      location,
      description,
      occupation,
    });

    await newUser.save();

    response.status(200).send({
      login_name: newUser.login_name,
      _id: newUser._id,
    });
  } catch (err) {
    console.error("/user registration error:", err);
    response.status(500).send({ error: "Server error during registration" });
  }
});

/**
 * URL /admin/logout - Logout user
 */
app.post("/admin/logout", (request, response) => {
  if (!request.session.user_id) {
    response.status(400).send({ error: "Not logged in" });
    return;
  }
  request.session.destroy((err) => {
    if (err) {
      response.status(500).send({ error: "Logout failed" });
      return;
    }
    response.status(200).send();
  });
});

// Middleware to check if user is logged in for all other routes
app.use((request, response, next) => {
  // Allow login/logout and static files (already handled above)
  // Also allow test endpoints if needed, but spec says "update all requests (except to /admin/login and /admin/logout)"
  // We should check if the request path is one of the protected API routes.
  // The static files are served before this middleware, so they are fine.
  // The login/logout routes are defined before this middleware, so they are fine.
  // We need to protect /user, /photosOfUser, /commentsOfUser, etc.

  // Actually, express executes middleware in order. 
  // If I place this middleware here, it will run for all subsequent route definitions.
  // Since login/logout are defined ABOVE, they won't be affected.
  // Static files are defined ABOVE, so they won't be affected.

  if (!request.session.user_id) {
    response.status(401).send({ error: "Unauthorized" });
    return;
  }
  next();
});

app.get("/", function (request, response) {
  response.send("Simple web server of files from " + __dirname);
});

/**
 * /test/info - Returns the SchemaInfo object of the database in JSON format.
 *              This is good for testing connectivity with MongoDB.
 */
app.get("/test/info", async (request, response) => {
  try {
    const info = await SchemaInfo.findOne({}).lean();
    if (!info) {
      response.status(500).send({ error: "No SchemaInfo document found" });
      return;
    }
    response.status(200).send(info);
  } catch (err) {
    console.error("/test/info error:", err);
    response.status(500).send({ error: "Server error fetching schema info" });
  }
});

/**
 * /test/counts - Returns an object with the counts of the different collections
 *                in JSON format.
 */
app.get("/test/counts", async (request, response) => {
  try {
    const [userCount, photoCount, schemaInfoCount] = await Promise.all([
      User.countDocuments({}).exec(),
      Photo.countDocuments({}).exec(),
      SchemaInfo.countDocuments({}).exec(),
    ]);
    response.status(200).send({
      user: userCount,
      photo: photoCount,
      schemaInfo: schemaInfoCount,
    });
  } catch (err) {
    console.error("/test/counts error:", err);
    response.status(500).send({ error: "Server error fetching counts" });
  }
});

/**
 * URL /user/list - Returns all the User objects.
 */
app.get('/user/list', async (request, response) => {
  try {
    const users = await User.find({}, "_id first_name last_name").lean();
    response.status(200).send(users);
  } catch (err) {
    console.error("/user/list error:", err);
    response.status(500).send({ error: "Server error fetching users" });
  }
});

/**
 * URL /user/:id - Returns the information for User (id).
 */
app.get("/user/:id", async (request, response) => {
  const { id } = request.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    response.status(400).send({ error: "Invalid user id" });
    return;
  }

  try {
    const user = await User.findById(id)
      .select("_id first_name last_name location description occupation")
      .lean();

    if (!user) {
      response.status(400).send({ error: "Not found" });
      return;
    }

    response.status(200).send(user);
  } catch (err) {
    console.error(`/user/${id} error:`, err);
    response.status(500).send({ error: "Server error fetching user" });
  }
});

/**
 * URL /photosOfUser/:id - Returns the Photos for User (id).
 */
app.get("/photosOfUser/:id", async (request, response) => {
  const { id } = request.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    response.status(400).send({ error: "Invalid user id" });
    return;
  }

  try {
    // Fetch user existence and the user's photos concurrently.
    const [userExists, photos] = await Promise.all([
      User.exists({ _id: id }),
      Photo.find({ user_id: id })
        .select("_id user_id file_name date_time comments likes")
        .lean(),
    ]);

    if (!userExists) {
      response.status(400).send({ error: "User not found" });
      return;
    }

    if (!photos || photos.length === 0) {
      // Valid user; just no photos.
      response.status(200).send([]);
      return;
    }

    // Collect all distinct commenter user_ids from all photos.
    const commenterIds = new Set();
    photos.forEach((photo) => {
      (photo.comments || []).forEach((c) => {
        if (c.user_id) commenterIds.add(c.user_id.toString());
      });
      // Also collect LIKERS
      (photo.likes || []).forEach((userId) => {
        commenterIds.add(userId.toString());
      });
    });

    // Fetch minimal user info for all commenters in one query.
    const commenters = await User.find({
      _id: { $in: Array.from(commenterIds) },
    })
      .select("_id first_name last_name")
      .lean();

    const commenterMap = {};
    commenters.forEach((u) => {
      commenterMap[u._id.toString()] = u;
    });

    // Shape the response photos according to the API spec.
    const responsePhotos = photos.map((p) => {
      const formattedComments = (p.comments || []).map((c) => {
        const userObj = commenterMap[c.user_id?.toString()] || null;
        return {
          _id: c._id,
          comment: c.comment,
          date_time: c.date_time,
          user: userObj,
        };
      });

      return {
        _id: p._id,
        user_id: p.user_id,
        file_name: p.file_name,
        date_time: p.date_time,
        comments: formattedComments,
        likes: (p.likes || []).map(userId => userId), // Send back the array of IDs (or map to user objects if requested, but IDs are sufficient for counting/checking self)
      };
    });

    response.status(200).send(responsePhotos);
  } catch (err) {
    console.error(`/photosOfUser/${id} error:`, err);
    response.status(500).send({ error: "Server error fetching photos" });
  }
});

/**
 * URL /commentsOfUser/:id - Returns all comments made by user (id).
 */
app.get("/commentsOfUser/:id", async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).send({ error: "Invalid user id" });
    return;
  }

  try {
    const userExists = await User.exists({ _id: id });
    if (!userExists) {
      res.status(400).send({ error: "User not found" });
      return;
    }

    const photos = await Photo.find({ "comments.user_id": id })
      .select("_id file_name user_id comments")
      .lean();

    const results = [];
    photos.forEach((p) => {
      (p.comments || []).forEach((c) => {
        if (c.user_id && c.user_id.toString() === id) {
          results.push({
            _id: c._id,
            comment: c.comment,
            date_time: c.date_time,
            photo: {
              _id: p._id,
              file_name: p.file_name,
              user_id: p.user_id,
            },
          });
        }
      });
    });

    res.status(200).send(results);
  } catch (err) {
    console.error(`/commentsOfUser/${id} error:`, err);
    res.status(500).send({ error: "Server error fetching comments" });
  }
});

/**
 * URL /commentsOfPhoto/:photo_id - Add a comment to the photo whose id is photo_id.
 */
app.post("/commentsOfPhoto/:photo_id", async (request, response) => {
  const { photo_id } = request.params;
  const { comment } = request.body;
  const { user_id } = request.session;

  if (!mongoose.Types.ObjectId.isValid(photo_id)) {
    response.status(400).send({ error: "Invalid photo id" });
    return;
  }

  if (!comment || comment.trim().length === 0) {
    response.status(400).send({ error: "Comment cannot be empty" });
    return;
  }

  if (!user_id) {
    response.status(401).send({ error: "Unauthorized" });
    return;
  }

  try {
    const photo = await Photo.findById(photo_id);
    if (!photo) {
      response.status(400).send({ error: "Photo not found" });
      return;
    }

    const newComment = {
      comment: comment,
      user_id: user_id,
      date_time: new Date(),
    };

    photo.comments.push(newComment);
    await photo.save();

    response.status(200).send({});
  } catch (err) {
    console.error(`/commentsOfPhoto/${photo_id} error:`, err);
    response.status(500).send({ error: "Server error adding comment" });
  }
});


/**
 * URL /commentsOfPhoto/:photo_id/:comment_id - Delete a comment
 */
app.delete("/commentsOfPhoto/:photo_id/:comment_id", async (request, response) => {
  const { photo_id, comment_id } = request.params;
  const { user_id } = request.session;

  if (!user_id) {
    response.status(401).send({ error: "Unauthorized" });
    return;
  }

  if (!mongoose.Types.ObjectId.isValid(photo_id) || !mongoose.Types.ObjectId.isValid(comment_id)) {
    response.status(400).send({ error: "Invalid IDs" });
    return;
  }

  try {
    console.log(`Deleting comment. Photo: ${photo_id}, Comment: ${comment_id}, User: ${user_id}`);
    const photo = await Photo.findById(photo_id);
    if (!photo) {
      console.log("Photo not found");
      response.status(404).send({ error: "Photo not found" });
      return;
    }

    // Debug comments
    console.log("Available comments:", photo.comments.map(c => c._id.toString()));

    const commentIndex = photo.comments.findIndex(c => c._id.toString() === comment_id);
    if (commentIndex === -1) {
      response.status(404).send({ error: "Comment not found" });
      return;
    }

    if (photo.comments[commentIndex].user_id.toString() !== user_id) {
      response.status(403).send({ error: "You can only delete your own comments" });
      return;
    }

    photo.comments.splice(commentIndex, 1);
    await photo.save();

    response.status(200).send({});
  } catch (err) {
    console.error(`/commentsOfPhoto/${photo_id}/${comment_id} error:`, err);
    response.status(500).send({ error: "Server error deleting comment" });
  }
});


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "images/");
  },
  filename: function (req, file, cb) {
    // Generate a unique filename: timestamp + original name
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

/**
 * URL /photos/new - Upload a new photo for the current user.
 */
app.post("/photos/new", upload.single("uploadedphoto"), async (request, response) => {
  if (!request.file) {
    response.status(400).send({ error: "No file uploaded" });
    return;
  }

  if (!request.session.user_id) {
    // If not logged in, delete the uploaded file to clean up
    fs.unlinkSync(request.file.path);
    response.status(401).send({ error: "Unauthorized" });
    return;
  }

  try {
    const newPhoto = new Photo({
      file_name: request.file.filename,
      date_time: new Date(),
      user_id: request.session.user_id,
      comments: [],
    });

    await newPhoto.save();
    response.status(200).send(newPhoto);
  } catch (err) {
    console.error("/photos/new error:", err);
    // Clean up file on error
    if (request.file && fs.existsSync(request.file.path)) {
      fs.unlinkSync(request.file.path);
    }
    response.status(500).send({ error: "Server error uploading photo" });
  }
});

/**
 * URL /photos/:id - Delete a photo
 */
app.delete("/photos/:id", async (request, response) => {
  const { id } = request.params;
  const { user_id } = request.session;

  if (!user_id) {
    response.status(401).send({ error: "Unauthorized" });
    return;
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    response.status(400).send({ error: "Invalid photo ID" });
    return;
  }

  try {
    const photo = await Photo.findById(id);
    if (!photo) {
      response.status(404).send({ error: "Photo not found" });
      return;
    }

    if (photo.user_id.toString() !== user_id) {
      response.status(403).send({ error: "You can only delete your own photos" });
      return;
    }

    // Delete the file from the filesystem (async logic, but sync is safer here for simplicity)
    const filePath = `images/${photo.file_name}`;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete the photo object
    await Photo.findByIdAndDelete(id);

    response.status(200).send({});
  } catch (err) {
    console.error(`/photos/${id} delete error:`, err);
    response.status(500).send({ error: "Server error deleting photo" });
  }
});

/**
 * URL /user/:id - Delete a user account
 */
app.delete("/user/:id", async (request, response) => {
  const { id } = request.params;
  const { user_id } = request.session;

  if (!user_id) {
    response.status(401).send({ error: "Unauthorized" });
    return;
  }

  if (id !== user_id) {
    response.status(403).send({ error: "You can only delete your own account" });
    return;
  }

  try {
    // 1. Delete all photos uploaded by the user
    // Find photos first to delete files
    const userPhotos = await Photo.find({ user_id: id });
    for (const photo of userPhotos) {
      const filePath = `images/${photo.file_name}`;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    // Delete photo documents
    await Photo.deleteMany({ user_id: id });

    // 2. Remove all comments made by the user on MULTIPLE photos
    // We need to update *other* photos (or all photos, but we just deleted user's photos)
    // Actually, simple way: Update all photos to pull comments where user_id matches.
    await Photo.updateMany(
      {},
      { $pull: { comments: { user_id: id } } }
    );

    // 3. Delete the user document
    await User.findByIdAndDelete(id);

    // 4. Destroy session
    request.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error", err);
        // Continue anyway
      }
      response.status(200).send({});
    });

  } catch (err) {
    console.error(`/user/${id} delete error:`, err);
    response.status(500).send({ error: "Server error deleting user" });
  }
});

/**
 * URL /photos/:id/like - Like or Unlike a photo
 */
app.post("/photos/:id/like", async (request, response) => {
  const { id } = request.params;
  const { user_id } = request.session;

  if (!user_id) {
    response.status(401).send({ error: "Unauthorized" });
    return;
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    response.status(400).send({ error: "Invalid photo ID" });
    return;
  }

  try {
    const photo = await Photo.findById(id);
    if (!photo) {
      response.status(404).send({ error: "Photo not found" });
      return;
    }

    // Toggle like
    const userIdStr = user_id.toString();
    const likeIndex = (photo.likes || []).findIndex(id => id.toString() === userIdStr);

    if (likeIndex === -1) {
      // Like
      if (!photo.likes) photo.likes = [];
      photo.likes.push(user_id);
    } else {
      // Unlike
      photo.likes.splice(likeIndex, 1);
    }

    await photo.save();

    // Broadcast update via Socket.io
    io.emit("like_update", {
      photo_id: id,
      likes: photo.likes
    });

    response.status(200).send({ likes: photo.likes });
  } catch (err) {
    console.error(`/photos/${id}/like error:`, err);
    response.status(500).send({ error: "Server error updating likes" });
  }
});

// Replaced app.listen with server.listen
server.listen(portno, function () {
  const port = server.address().port;
  console.log(
    "Listening at http://localhost:" +
    port +
    " exporting the directory " +
    __dirname
  );
  console.log("Server updated with Story 6 Like features & Sockets.");
});
