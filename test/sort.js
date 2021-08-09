import {sort} from 'vfile-sort'

/** @type {import('unified').Plugin<void[]>} */
export default function unifiedSort() {
  return (_, file) => {
    sort(file)
  }
}
