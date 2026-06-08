// API route to trigger on-demand revalidation
export default async function handler(req, res) {
  // Check for secret to confirm this is a valid request
  if (req.query.secret !== process.env.REVALIDATE_SECRET) {
    return res.status(401).json({ message: 'Invalid token' })
  }

  try {
    // Revalidate the homepage
    await res.revalidate('/')

    return res.json({ revalidated: true, message: 'Homepage revalidated successfully' })
  } catch (err) {
    // If there was an error, Next.js will continue to show the last successfully generated page
    return res.status(500).json({ message: 'Error revalidating', error: err.message })
  }
}
