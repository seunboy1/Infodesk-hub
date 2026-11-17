// The backend calls this after an admin save, with a secret only the two servers know
export default async function handler(req, res) {
  if (!process.env.REVALIDATE_SECRET || req.headers['x-revalidate-secret'] !== process.env.REVALIDATE_SECRET) {
    return res.status(401).json({ message: 'Invalid token' })
  }

  try {
    await res.revalidate('/')
    return res.json({ revalidated: true })
  } catch (err) {
    // If there was an error, Next.js will continue to show the last successfully generated page
    return res.status(500).json({ message: 'Error revalidating' })
  }
}
