const mongoose = require('mongoose')

const ShopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a shop name'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
      maxlength: [500, 'Description cannot be more than 500 characters'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    address: {
      village: {
        type: String,
        required: [true, 'Please provide a village name'],
        trim: true,
      },
      street: {
        type: String,
        required: [true, 'Please provide a street name'],
        trim: true,
      },
      district: {
        type: String,
        required: [true, 'Please provide a district name'],
        trim: true,
      },
      state: {
        type: String,
        required: [true, 'Please provide a state name'],
        trim: true,
      },
      pincode: {
        type: String,
        required: [true, 'Please provide a pincode'],
        match: [/^[0-9]{6}$/, 'Please enter a valid 6-digit pincode'],
      },
      phone: {
        type: String,
        required: [true, 'Please provide a phone number'],
        match: [/^[0-9]{10}$/, 'Please add a valid phone number'],
      },
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    images: [
      {
        type: String,
      },
    ],
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating must be at least 0'],
      max: [5, 'Rating cannot be more than 5'],
    },
    reviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        text: {
          type: String,
          required: true,
          maxlength: [200, 'Review cannot be more than 200 characters'],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: {virtuals: true},
    toObject: {virtuals: true},
  }
)

// Index location for geospatial queries
ShopSchema.index({location: '2dsphere'})
// Index for search
ShopSchema.index({name: 'text', description: 'text'})

// Virtual field for products in this shop
ShopSchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'shop',
  justOne: false,
})

// Update shop rating based on reviews
ShopSchema.methods.updateRating = function () {
  const reviews = this.reviews

  if (reviews.length === 0) {
    this.rating = 0
  } else {
    const sum = reviews.reduce((total, review) => total + review.rating, 0)
    this.rating = (sum / reviews.length).toFixed(1)
  }

  return this.save()
}

module.exports = mongoose.model('Shop', ShopSchema)
