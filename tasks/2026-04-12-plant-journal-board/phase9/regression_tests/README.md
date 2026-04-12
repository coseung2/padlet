# Regression test bundle

No automated test runner is wired in this repo. The `qa_report.md` curl sequences double as a manual regression script — rerun the listed commands after any edit to plant-journal routes/components.

Minimum regression set (paste into a shell after `npm run dev` + seed):

```sh
# 1. student login
curl -c /tmp/c.txt -X POST http://localhost:3000/api/student/auth \
     -H "Content-Type: application/json" -d '{"token":"PLNT01"}'

# 2. create plant
TID=$(curl -sb /tmp/c.txt http://localhost:3000/api/species \
   | python3 -c "import json,sys;print([s['id'] for s in json.load(sys.stdin)['species'] if s['key']=='tomato'][0])")
curl -b /tmp/c.txt -X POST http://localhost:3000/api/student-plants \
     -H "Content-Type: application/json" \
     -d "{\"boardId\":\"b_plant\",\"speciesId\":\"$TID\",\"nickname\":\"테스트\"}"

# 3. advance without photos should require reason
curl -b /tmp/c.txt -X POST http://localhost:3000/api/student-plants/<PLANT_ID>/advance-stage \
     -H "Content-Type: application/json" -d '{}'
# expect HTTP 400 require_reason

# 4. matrix access as owner + desktop
curl --cookie "as=owner" http://localhost:3000/api/classrooms/c_plant_demo/matrix \
     -H "X-Client-Width: 1440"
# expect HTTP 200
```

Any deviation from these status codes ⇒ regression.
