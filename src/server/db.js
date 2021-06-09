const mongoose = require('mongoose');

const { Schema } = mongoose;

const User = new Schema(
  {
    'number': { type: Number, index: { unique: true } },
    'hash': String,
    'miner': { type: String, lowercase: true },
    'timestamp': Number,
  }, { collection: 'User' },
);

// create indices
User.index({ miner: 1 });
User.index({ miner: 1, blockNumber: -1 });
User.index({ hash: 1, number: -1 });

mongoose.model('User', User);
module.exports.Block = mongoose.model('User');

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/faultDB', {
  useMongoClient: true
  // poolSize: 5,
  // rs_name: 'myReplicaSetName',
  // user: 'explorer',
  // pass: 'yourdbpasscode'
});

// mongoose.set('debug', true);
