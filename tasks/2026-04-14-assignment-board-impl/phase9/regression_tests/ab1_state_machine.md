# Regression — AB-1 state machine

`src/lib/__tests__/assignment-state.test.ts` — 24 deterministic cases covering every transition branch + every `canStudentSubmit` predicate path.

## Run

```
npx tsx src/lib/__tests__/assignment-state.test.ts
```

## Cases

- canStudentSubmit: no deadline / future deadline / past+allowLate / past+strict / graded / released / orphaned
- computeTeacherTransition.open: submitted→viewed / viewed idempotent / assigned invalid
- computeTeacherTransition.return: viewed→returned (reason persisted, grading reset) / assigned invalid
- computeTeacherTransition.review: viewed→reviewed / assigned invalid
- computeTeacherTransition.grade: submitted→graded (grade persisted, status preserved) / orphaned invalid
- computeStudentSubmit: assigned→submitted / returned→submitted / submitted→submitted / orphaned blocked

## Latest run

```
24 passed, 0 failed
```
