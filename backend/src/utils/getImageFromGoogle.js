const axios = require('axios')
const config = require('../config/index.js')

const getImageFromGoogle = async (productName) => {
  const apiKey = config.image.google_api_key
  const cx = config.image.google_cse_id
  const searchUrl = 'https://www.googleapis.com/customsearch/v1'

  // Debug: Make sure keys are set
  if (!apiKey || !cx) {
    console.error('Google API Key or CSE ID is missing.')
    return null
  }

  try {
    const response = await axios.get(searchUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'axios' // Helps mimic standard request
      },
      params: {
        key: apiKey,
        cx: cx,
        q: productName,
        searchType: 'image',
        num: 1
      }
    })

    const items = response.data.items
    if (items && items.length > 0) {
      return items[0].link
    } else {
      console.warn('No image results found.')
      return null
    }
  } catch (err) {
    // Log full error response for debugging
    if (err.response) {
      console.error('Google API Error:', err.response.status, err.response.data)
    } else {
      console.error('Request failed:', err.message)
    }
    return null
  }
}

module.exports = getImageFromGoogle
