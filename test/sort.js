import {sort} from 'vfile-sort'

export default function unifiedSort() {
  return transform
}

function transform(tree, file) {
  sort(file)
}
