const mongoose = require('mongoose')

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a product name'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
      maxlength: [500, 'Description cannot be more than 500 characters'],
    },
    type: {
      type: String,
      required: [true, 'Please specify the product type'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Please specify the product category'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Please add a price'],
      min: [0, 'Price must be at least 0'],
    },
    units: {
      type: String,
      required: [true, 'Please specify the units'],
      trim: true,
    },
    stock: {
      type: Number,
      required: [true, 'Please add stock quantity'],
      min: [0, 'Stock must be at least 0'],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount must be at least 0'],
      max: [100, 'Discount cannot be more than 100%'],
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating must be at least 0'],
      max: [5, 'Rating cannot be more than 5'],
    },
    image: {
      type: String,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
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
    featured: {
      type: Boolean,
      default: false,
    },
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

// Index for search
ProductSchema.index({name: 'text', description: 'text', category: 'text', type: 'text'})

// Calculate discounted price
ProductSchema.virtual('discountedPrice').get(function () {
  return this.rate - this.rate * (this.discount / 100)
})

// Update product rating based on reviews
ProductSchema.methods.updateRating = function () {
  const reviews = this.reviews

  if (reviews.length === 0) {
    this.rating = 0
  } else {
    const sum = reviews.reduce((total, review) => total + review.rating, 0)
    this.rating = (sum / reviews.length).toFixed(1)
  }

  return this.save()
}

module.exports = mongoose.model('Product', ProductSchema)
