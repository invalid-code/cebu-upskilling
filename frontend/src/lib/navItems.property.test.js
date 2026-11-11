import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { navItemsFor, canAccessPath } from './navItems.js'

const NUM_RUNS = 200

const KNOWN_GROUP_LABELS = {
  learner: ['My pathway', 'Account'],
  recruiter: ['Employer tools'],
  courseprovider: ['Provider studio'],
}

// Arbitrary role strings, biased towards the three real roles in varied casing.
const knownRole = fc
  .constantFrom('Learner', 'Recruiter', 'CourseProvider')
  .chain((r) =>
    fc.array(fc.boolean(), { minLength: r.length, maxLength: r.length }).map((flags) =>
      [...r].map((c, i) => (flags[i] ? c.toUpperCase() : c.toLowerCase())).join(''),
    ),
  )
const roleArb = fc.oneof(
  knownRole,
  fc.string(),
  fc.constantFrom('', ' ', 'Admin', 'Learner ', 'course provider', 'learners', null, undefined),
)

const userArb = roleArb.map((role) => (role === undefined ? {} : { role }))

// Feature: frontend-design, Property 2: Nav reachability
describe('Property 2: Nav reachability', () => {
  /**
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
   */
  it('every returned item passes the role guard and groups are non-empty', () => {
    fc.assert(
      fc.property(userArb, (user) => {
        const groups = navItemsFor(user)
        for (const group of groups) {
          expect(group.items.length).toBeGreaterThan(0)
          for (const item of group.items) {
            expect(canAccessPath(user, item.to)).toBe(true)
          }
        }
      }),
      { numRuns: NUM_RUNS },
    )
  })

  it('null, missing and unknown roles yield []', () => {
    const unknownRole = fc
      .oneof(fc.string(), fc.constantFrom('', 'Admin', 'Learner ', null, undefined))
      .filter((r) => !['learner', 'recruiter', 'courseprovider'].includes(String(r).toLowerCase()))
    fc.assert(
      fc.property(unknownRole, (role) => {
        expect(navItemsFor({ role })).toEqual([])
        expect(navItemsFor({})).toEqual([])
      }),
      { numRuns: NUM_RUNS },
    )
    expect(navItemsFor(null)).toEqual([])
    expect(navItemsFor(undefined)).toEqual([])
  })

  it('known roles (any casing) yield only their own labelled groups', () => {
    fc.assert(
      fc.property(knownRole, (role) => {
        const groups = navItemsFor({ role })
        expect(groups.map((g) => g.label)).toEqual(KNOWN_GROUP_LABELS[role.toLowerCase()])
      }),
      { numRuns: NUM_RUNS },
    )
  })
})
