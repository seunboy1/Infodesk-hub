import Bookstore from './bookstore'

// The same shop in the info desk's dark colours
export default function BookstoreDark(props) {
  return <Bookstore {...props} path="/bookstore-dark" dark />
}

export { getStaticProps } from './bookstore'
