'use strict';

// In-memory stubs for the mongoose models used by controllers during tests.
// The stub preserves the *contract* the controllers rely on — input shapes,
// return shapes, throw semantics — without needing a real MongoDB.

function makeId() {
  return Array.from(
    { length: 24 },
    () => Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

function snapshot(d) {
  return { ...d, _id: d._id };
}

function makeProductStub() {
  const docs = new Map();

  // A mongoose-document-shaped wrapper around a plain record. Exposes the
  // mutators the controllers use (e.g. `.save()`) and serializes to JSON
  // as a plain object.
  function wrap(rec) {
    const doc = {
      _id: rec._id,
      name: rec.name,
      sku: rec.sku,
      outlet: rec.outlet,
      quantity: rec.quantity,
      price: rec.price,
      lowStockThreshold: rec.lowStockThreshold,
      __v: rec.__v || 0,
      createdAt: rec.createdAt,
      updatedAt: rec.updatedAt,
      save: async function save() {
        doc.__v = (doc.__v || 0) + 1;
        doc.updatedAt = new Date().toISOString();
        docs.set(doc._id, {
          _id: doc._id, name: doc.name, sku: doc.sku, outlet: doc.outlet,
          quantity: doc.quantity, price: doc.price,
          lowStockThreshold: doc.lowStockThreshold,
          __v: doc.__v, createdAt: doc.createdAt, updatedAt: doc.updatedAt,
        });
        return wrap(docs.get(doc._id));
      },
      toJSON() {
        return {
          _id: doc._id, name: doc.name, sku: doc.sku, outlet: doc.outlet,
          quantity: doc.quantity, price: doc.price,
          lowStockThreshold: doc.lowStockThreshold,
          __v: doc.__v, createdAt: doc.createdAt, updatedAt: doc.updatedAt,
        };
      },
    };
    return doc;
  }

  const Product = function () {};

  Product.create = async function (payload) {
    for (const d of docs.values()) {
      if (d.sku === payload.sku) {
        const err = new Error('duplicate key');
        err.code = 11000;
        throw err;
      }
    }
    const _id = makeId();
    const rec = {
      _id,
      name: payload.name,
      sku: payload.sku,
      outlet: payload.outlet,
      quantity: payload.quantity,
      price: payload.price,
      lowStockThreshold: payload.lowStockThreshold,
      __v: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    docs.set(_id, rec);
    return wrap(rec);
  };

  function Query(filter) {
    this.filter = filter || {};
    this.sortSpec = null;
    this.limitN = null;
  }
  Query.prototype.sort = function (spec) {
    this.sortSpec = spec;
    return this;
  };
  Query.prototype.limit = function (n) {
    this.limitN = n;
    return this;
  };
  Query.prototype.exec = async function () {
    let arr = Array.from(docs.values()).filter((d) => {
      for (const k of Object.keys(this.filter)) {
        const f = this.filter[k];
        if (f && typeof f === 'object' && '$gte' in f) {
          if (!(d[k] >= f.$gte)) return false;
        } else if (typeof f === 'object' && f !== null && '$text' in f) {
          const q = String(f.$search || '').toLowerCase();
          const matches =
            (d.name || '').toLowerCase().includes(q) ||
            (d.sku || '').toLowerCase().includes(q);
          if (!matches) return false;
        } else if (d[k] !== f) {
          return false;
        }
      }
      return true;
    });
    if (this.sortSpec) {
      const keys = Object.keys(this.sortSpec);
      arr = arr.slice().sort((a, b) => {
        for (const k of keys) {
          const sign = this.sortSpec[k];
          if (a[k] < b[k]) return -1 * sign;
          if (a[k] > b[k]) return 1 * sign;
        }
        return 0;
      });
    }
    if (this.limitN != null) arr = arr.slice(0, this.limitN);
    return arr.map(wrap);
  };
  Query.prototype.then = function (resolve, reject) {
    return this.exec().then(resolve, reject);
  };
  Query.prototype.catch = function (reject) {
    return this.exec().catch(reject);
  };

  Product.find = function (filter) {
    return new Query(filter);
  };

  Product.findById = async function (id) {
    return docs.has(id) ? wrap(docs.get(id)) : null;
  };

  Product.findOneAndUpdate = async function (filter, update, opts) {
    const found = Array.from(docs.values()).find((d) => {
      for (const k of Object.keys(filter)) {
        const f = filter[k];
        if (f && typeof f === 'object' && '$gte' in f) {
          if (!(d[k] >= f.$gte)) return false;
        } else if (d[k] !== f) {
          return false;
        }
      }
      return true;
    });
    if (!found) return null;
    if (update && update.$inc) {
      for (const k of Object.keys(update.$inc)) {
        found[k] = (found[k] || 0) + update.$inc[k];
      }
    }
    found.updatedAt = new Date().toISOString();
    return wrap(found);
  };

  Product._all = () => Array.from(docs.values()).map(wrap);
  Product._reset = () => docs.clear();

  return Product;
}

function makeOrderStub() {
  const docs = [];

  function Order() {}

  Order.create = async function (arr) {
    if (!Array.isArray(arr) || arr.length === 0) {
      throw new Error('Order.create requires a non-empty array');
    }
    const out = arr.map((doc) => ({
      _id: makeId(),
      outlet: doc.outlet,
      items: doc.items,
      totalAmount: doc.totalAmount,
      status: doc.status || 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    docs.push(...out);
    return out;
  };

  function Query(filter) {
    this.filter = filter || {};
    this.sortSpec = null;
    this.limitN = null;
  }
  Query.prototype.sort = function (spec) {
    this.sortSpec = spec;
    return this;
  };
  Query.prototype.limit = function (n) {
    this.limitN = n;
    return this;
  };
  Query.prototype.exec = async function () {
    let arr = docs.filter((d) => {
      for (const k of Object.keys(this.filter)) {
        if (d[k] !== this.filter[k]) return false;
      }
      return true;
    });
    if (this.sortSpec) {
      const keys = Object.keys(this.sortSpec);
      arr = arr.slice().sort((a, b) => {
        for (const k of keys) {
          const sign = this.sortSpec[k];
          if (a[k] < b[k]) return -1 * sign;
          if (a[k] > b[k]) return 1 * sign;
        }
        return 0;
      });
    }
    if (this.limitN != null) arr = arr.slice(0, this.limitN);
    return arr.map((d) => ({ ...d }));
  };
  Query.prototype.then = function (resolve, reject) {
    return this.exec().then(resolve, reject);
  };
  Query.prototype.catch = function (reject) {
    return this.exec().catch(reject);
  };

  Order.find = function (filter) {
    return new Query(filter);
  };

  Order._all = () => docs.slice();
  Order._reset = () => (docs.length = 0);

  return Order;
}

module.exports = { makeProductStub, makeOrderStub };