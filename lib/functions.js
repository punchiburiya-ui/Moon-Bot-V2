const axios = require('axios')
const fs = require('fs')
const sharp = require('sharp')
const crypto = require('crypto')
const { generateWAMessageFromContent, prepareWAMessageMedia } = require('@pontalabs/baileys')

// Safe lightweight placeholder image
const PLACEHOLDER_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCgoJDREQDg8QEBAQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8gH//Z',
  'base64'
);

const fetchAndResizeThumbnail = async (url) => {
    if (!url) return null
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 5000,
            headers: { 'User-Agent': 'Mozilla/5.0' },
            validateStatus: (status) => status === 200
        })
        return Buffer.from(response.data)
    } catch (e) {
        return null
    }
}

const getLocationThumbnailBuffer = async (videoId, fallbackUrl) => {
    if (videoId) {
        try {
            const hqUrl = `https://images.weserv.nl/?url=${encodeURIComponent(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`)}&w=336&h=224&fit=cover&output=jpg&q=75`
            const hqBuffer = await fetchAndResizeThumbnail(hqUrl)
            if (hqBuffer) return hqBuffer
        } catch (e) {}
    }
    if (fallbackUrl) {
        try {
            const proxied = `https://images.weserv.nl/?url=${encodeURIComponent(fallbackUrl)}&w=336&h=224&fit=cover&output=jpg&q=75`
            const buf = await fetchAndResizeThumbnail(proxied)
            if (buf) return buf
        } catch (e) {}
        try {
            const direct = await fetchAndResizeThumbnail(fallbackUrl)
            if (direct) {
                try {
                    return await sharp(direct).resize(336, 224, { fit: 'cover' }).toFormat('jpeg', { quality: 75, mozjpeg: true }).toBuffer()
                } catch (sharpErr) {
                    return direct
                }
            }
        } catch (e) {}
    }
    return PLACEHOLDER_JPEG;
}

// Thumbnail used inside the locationMessage header of button/list messages.
// Bumped up from 150x100 q40 (very blurry) to 336x224 q75, and we fall back
// to a slightly smaller/lower-quality pass only if the first pass comes out
// too large. This keeps the image sharp while still staying safely small
// enough that WhatsApp renders it correctly on mobile.
async function getSafeThumbnail(imageBuffer) {
  let rawBuffer = null;
  if (imageBuffer) {
    try {
      if (typeof imageBuffer === 'string' && (imageBuffer.startsWith('http://') || imageBuffer.startsWith('https://'))) {
        const response = await axios.get(imageBuffer, { 
          responseType: 'arraybuffer',
          timeout: 5000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        rawBuffer = Buffer.from(response.data);
      } else if (typeof imageBuffer === 'string') {
        if (fs.existsSync(imageBuffer)) {
          rawBuffer = fs.readFileSync(imageBuffer);
        }
      } else if (Buffer.isBuffer(imageBuffer)) {
        rawBuffer = imageBuffer;
      }
    } catch (err) {
      console.warn('Thumbnail resize warning:', err.message);
    }
  }

  if (!rawBuffer || rawBuffer.length === 0) {
    rawBuffer = PLACEHOLDER_JPEG;
  }

  const MAX_THUMB_BYTES = 25 * 1024; // stay well under WA's render limit

  try {
    let out = await sharp(rawBuffer)
      .resize(336, 224, { fit: 'cover' })
      .toFormat('jpeg', { quality: 75, mozjpeg: true })
      .toBuffer();

    if (out.length > MAX_THUMB_BYTES) {
      out = await sharp(rawBuffer)
        .resize(240, 160, { fit: 'cover' })
        .toFormat('jpeg', { quality: 60, mozjpeg: true })
        .toBuffer();
    }
    return out;
  } catch (sharpError) {
    return PLACEHOLDER_JPEG;
  }
}


const getBuffer = async(url, options) => {
	try {
		options ? options : {}
		var res = await axios({
			method: 'get',
			url,
			headers: { 'DNT': 1, 'Upgrade-Insecure-Request': 1 },
			...options,
			responseType: 'arraybuffer'
		})
		return res.data
	} catch (e) { console.log(e) }
}

const getGroupAdmins = (participants) => {
	var admins = []
	for (let i of participants) {
		i.admin !== null  ? admins.push(i.id) : ''
	}
	return admins
}

const getRandom = (ext) => {
	return `${Math.floor(Math.random() * 10000)}${ext}`
}

const h2k = (eco) => {
	var lyrik = ['', 'K', 'M', 'B', 'T', 'P', 'E']
	var ma = Math.log10(Math.abs(eco)) / 3 | 0
	if (ma == 0) return eco
	var ppo = lyrik[ma]
	var scale = Math.pow(10, ma * 3)
	var scaled = eco / scale
	var formatt = scaled.toFixed(1)
	if (/\.0$/.test(formatt)) formatt = formatt.substr(0, formatt.length - 2)
	return formatt + ppo
}

const isUrl = (url) => {
	return url.match(
		new RegExp(
			/https?:\/\/(www\.)?[-a-zA-Z0-9@:%.+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%+.~#?&/=]*)/,
			'gi'
		)
	)
}

const Json = (string) => { return JSON.stringify(string, null, 2) }

const runtime = (seconds) => {
	seconds = Number(seconds)
	var d = Math.floor(seconds / (3600 * 24))
	var h = Math.floor(seconds % (3600 * 24) / 3600)
	var m = Math.floor(seconds % 3600 / 60)
	var s = Math.floor(seconds % 60)
	var dDisplay = d > 0 ? d + (d == 1 ? ' day, ' : ' days, ') : ''
	var hDisplay = h > 0 ? h + (h == 1 ? ' hour, ' : ' hours, ') : ''
	var mDisplay = m > 0 ? m + (m == 1 ? ' minute, ' : ' minutes, ') : ''
	var sDisplay = s > 0 ? s + (s == 1 ? ' second' : ' seconds') : ''
	return dDisplay + hDisplay + mDisplay + sDisplay;
}

const sleep = async(ms) => { return new Promise(resolve => setTimeout(resolve, ms)) }

const fetchJson = async (url, options) => {
    try {
        options ? options : {}
        const res = await axios({
            method: 'GET',
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
            },
            ...options
        })
        return res.data
    } catch (err) { return err }
}

module.exports = { 
  getBuffer, 
  getGroupAdmins, 
  getRandom, 
  h2k, 
  isUrl, 
  Json, 
  runtime, 
  sleep, 
  fetchJson,
  getLocationThumbnailBuffer,
  getSafeThumbnail 
};
