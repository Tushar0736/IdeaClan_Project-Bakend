const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const bcrypt = require('bcrypt');

const app = express();

// Dummy data for users and posts
let users = [];
let posts = [];

// GraphQL schema
const schema = buildSchema(`
  type User {
    id: ID!
    username: String!
    email: String!
    posts: [Post]!
    following: [User]!
  }

  type Post {
    id: ID!
    content: String!
    author: User!
  }

  type Query {
    getUser(id: ID!): User
    getPostsByUser(userId: ID!): [Post]
    getFeed(userId: ID!): [Post]
  }

  type Mutation {
    createUser(username: String!, email: String!, password: String!): User
    login(email: String!, password: String!): User
    createPost(userId: ID!, content: String!): Post
    followUser(userId: ID!, followId: ID!): User
    unfollowUser(userId: ID!, unfollowId: ID!): User
  }
`);

// Resolver functions
const root = {
  getUser: ({ id }) => users.find(user => user.id === id),
  getPostsByUser: ({ userId }) => posts.filter(post => post.author.id === userId),
  getFeed: ({ userId }) => {
    const user = users.find(u => u.id === userId);
    const followingIds = user.following.map(u => u.id);
    
    // Include posts authored by the user themselves
    const feed = posts.filter(post => post.author.id === userId || followingIds.includes(post.author.id));
    
    return feed;
  },
  createUser: async ({ username, email, password }) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { id: String(users.length + 1), username, email, password: hashedPassword, following: [] };
    users.push(newUser);
    return newUser;
  },
  login: async ({ email, password }) => {
    const user = users.find(u => u.email === email);
    if (!user) {
      throw new Error('User not found!');
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new Error('Invalid password!');
    }
    return user;
  },
  createPost: ({ userId, content }) => {
    const author = users.find(user => user.id === userId);
    if (!author) {
      throw new Error('User not found!');
    }
    const newPost = { id: String(posts.length + 1), content, author };
    posts.push(newPost);
    return newPost;
  },
  followUser: ({ userId, followId }) => {
    const user = users.find(u => u.id === userId);
    const followUser = users.find(u => u.id === followId);
    if (!user || !followUser) {
      throw new Error('User not found!');
    }
    if (!user.following.includes(followUser)) {
      user.following.push(followUser);
    }
    return user;
  },
  unfollowUser: ({ userId, unfollowId }) => {
    const user = users.find(u => u.id === userId);
    const unfollowUserIndex = user.following.findIndex(u => u.id === unfollowId);
    if (unfollowUserIndex !== -1) {
      user.following.splice(unfollowUserIndex, 1);
    }
    return user;
  },
};

// Middleware for GraphQL endpoint
app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true, // Enable GraphiQL for easy testing
}));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});