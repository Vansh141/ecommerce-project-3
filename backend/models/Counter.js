const mongoose = require('mongoose');

/**
 * Atomic sequence generator, used for human-readable order numbers.
 *
 * A findOneAndUpdate with $inc and upsert is atomic in MongoDB, so concurrent
 * checkouts can never receive the same sequence value — unlike a
 * count-documents-and-add-one approach.
 */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

counterSchema.statics.next = async function next(key) {
  const doc = await this.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
  );
  return doc.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
