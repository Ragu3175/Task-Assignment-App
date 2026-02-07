/**
 * Seeds the TEST_DATABASE for running API tests.
 * Uses TEST_DATABASE from .env (e.g. mongodb://localhost:27017/taskassignment_test).
 * Run: node seedTest.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./Models/SignupModel');
const Group = require('./Models/groupmodel');

const TEST_DB = process.env.TEST_DATABASE;

if (!TEST_DB) {
  console.error('Missing TEST_DATABASE in .env');
  process.exit(1);
}

const seedUsers = [
  { username: 'SeedAdmin', email: 'seedadmin@test.com', password: 'SeedPass123' },
  { username: 'SeedMember', email: 'seedmember@test.com', password: 'SeedPass456' },
  { username: 'SeedUser3', email: 'seeduser3@test.com', password: 'SeedPass789' },
];

async function seed() {
  try {
    await mongoose.connect(TEST_DB);
    console.log('Connected to TEST_DATABASE:', TEST_DB);

    await User.deleteMany({ email: { $in: seedUsers.map((u) => u.email) } });
    await Group.deleteMany({ groupname: 'SeedTestGroup' });

    const created = [];
    for (const u of seedUsers) {
      const hashed = await bcrypt.hash(u.password, 10);
      const user = await User.create({
        username: u.username,
        email: u.email,
        password: hashed,
      });
      created.push({ ...u, _id: user._id });
    }
    console.log('Seeded users:', created.map((u) => u.email).join(', '));

    const admin = await User.findOne({ email: 'seedadmin@test.com' });
    if (admin) {
      const group = await Group.create({
        groupname: 'SeedTestGroup',
        createdBy: admin._id,
        members: [admin._id],
        admins: [admin._id],
      });
      admin.teams.push(group._id);
      await admin.save();
      console.log('Seeded group: SeedTestGroup');
    }

    console.log('Seed completed.');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
