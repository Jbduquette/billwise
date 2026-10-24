import type { CategoryId } from '../../lib/types'
import { category } from '../../lib/categories'
import { cx } from '../../lib/cx'

/** A small printed diamond in the category's ink. Decorative: the category's name always sits beside it. */
export function CategoryMark({ id, className }: { id: CategoryId; className?: string }) {
  return (
    <span
      aria-hidden
      className={cx('inline-block size-[7px] shrink-0 rotate-45 rounded-[1px] align-middle', className)}
      style={{ background: category(id).ink }}
    />
  )
}
