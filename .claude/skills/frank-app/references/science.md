# The evidence rules behind the plans

Members pay for plans "with the backing of science", so every rule the
generator follows is written down here with where it lives in the code and its
sources. Numbers in brackets are the sources in `js/science.js` (shown to users
on the science screen, with links). Keep the two files in step.

A change that breaks a rule needs a newer or better source and Frank's yes.
Checked 2 October 2026.

## Volume and frequency

| Rule | In the code |
|---|---|
| Adults: 150 to 300 min moderate or 75 to 150 min vigorous activity a week [1, 2]. | `movingCard()` in `js/app.js`: goal 150 min, 250 for fat loss (more activity helps weight loss [23]), but 150 for anyone `atRisk()` (pregnant, maybe under 18, a medical condition). Walks count. |
| Strength work for all major muscles on 2+ days a week [1, 3]; each muscle twice a week [5, 6]. | `ROTATION` in `js/programs.js`: every goal x days x level x kit trains lower body, upper body and core on 2+ days a week. `node tools/check-plans.cjs` counts it; run it after any change to workouts or rotations. |
| 48 h before training the same muscles hard again [3]. | `WEEK` (training days) with `ROTATION` (alternating body parts). |
| About 10+ hard sets per muscle a week; gains flatten near 18 to 20 [5, 7, 8]. | Rounds per level (below) times twice a week. The focus block adds sets for the parts a person picked. |

## Dose and progression

| Rule | In the code |
|---|---|
| Sets need not go to failure; 2 to 3 reps in reserve works [5, 10]. Exact RIR targets are unproven. | Copy says "stop with two or three good reps left". Doses in `js/exercises.js` (`dose: { b, i, a }`). |
| Muscle grows from roughly 6 to 30 reps near failure [9, 10]; past ~30, use a harder variation. | Rep doses stay in 6 to 25. `alts` and the swap sheet move people along the ladder. |
| Add reps first, then a harder variation [15, 4]. Push-up ladder by load: high box 41%, knees 49%, low box 55%, floor 64%, feet up 70 to 74% of body weight [16]. | `WEEK_MULT` [1, 1.1, 1.2, 1.3] raises doses about 10% a week. Each new 28-day round adds 15% (`ctx()` in `js/app.js`). Push-up `alts` follow the ladder. |
| Beginners 1 to 2 rounds, others up to 3 to 4 [5]. | `buildSession`: max rounds `{ b: 2, i: 3, a: 4 }`, fitted to the minutes the person has. |
| Feedback tunes the next sessions. | "How did that feel?": easy +5%, hard −8%, kept between 0.75 and 1.3 (`feel` action in `js/app.js`). |

## Rest, warm-up, cool-down

| Rule | In the code |
|---|---|
| Rest 60 to 120 s per muscle for beginners; over 90 s adds little for growth [13]. Circuits keep each muscle resting while others work and halve the time [14]. | `buildWith`: change-over `{ b: 30, i: 20, a: 15 }` s (+10 strength, −5 fat loss), +15 s between rounds. With 5 to 7 moves a round, each muscle gets well over a minute. |
| A 5 to 10 min warm-up helps [17]; static holds under 60 s barely cost strength [18]. | `WARM` lists: 2 to 3 easy moves. Stretch holds 30 s or less. |
| Cool-downs don't reduce soreness or injury [19]. | `COOL` lists are short and optional in Frank's sessions (`k` flag). |

## Fat loss

| Rule | In the code |
|---|---|
| Intervals and steady cardio do about the same for fat loss; intervals take less time [20, 21]. | Fat-loss plans keep at least two strength days and at most two interval (cardio) days (`tools/check-plans.cjs`). |
| Exercise alone: about 1.5 to 3.5 kg; with diet, more. Strength work keeps muscle [23]. | Onboarding and Today copy. No promises of numbers. |
| Pace 0.5 to 1% of body weight a week; ~1.6 g protein per kg [24, 25]. "7,700 kcal = 1 kg" overstates [36]. | `targetBox()` and `weightChart()` in `js/app.js`: dates at 0.5 to 1%, chart at 0.75%. Warns when the target is below BMI 18.5. No target for anyone `atRisk()`: the onboarding skips the step. |
| Viana 2019 (HIIT and fat loss) was retracted. | Not used anywhere. |

## Safety

| Rule | In the code |
|---|---|
| PAR-Q+ 2025: any yes means checking with a doctor or qualified professional before vigorous activity [30, 31]. | `PARQ` and `avoidFor()` in `js/programs.js`: gentle mode (beginner level, no jumps, no move with MET ≥ 7, cardio days become mobility) until the person switches on "Cleared by a doctor" in Me. |
| Pregnancy: 150 min a week incl. strength; after the first trimester avoid lying flat on the back; avoid falls and contact [1, 35]. | `avoidFor()`: no supine or prone moves, no jumps, no balance pad or rings. Warning in onboarding; switch in Me. |
| 60+: balance and strength on 3+ days [1]; balance plus strength cuts falls by about a third [26]. | `avoidFor()`: no jumps; `buildWith` adds a balance drill to every session. |
| Exercise helps chronic low-back pain; "core stability" is no better than other exercise [27]. Anti-movement holds load the spine lightly [28]. | Sore lower back removes crunches, leg raises, V-ups, flutter kicks and back extensions (`STRESS.back` in `js/exercises.js`). |
| Sore spots. | `STRESS` lists per joint; `safe()` and `pick()` swap moves that load them. Copy: "Stop any move that hurts." |
| Intervals carry more risk than moderate work for heart patients [22]. | Covered by gentle mode. |

## Calories

| Rule | In the code |
|---|---|
| kcal/min = MET x 3.5 x kg / 200, METs from the 2024 Compendium [32]; 2.7 replaces 3.5 from 60 [33]. Population averages [32]. | `kcal()` in `js/programs.js`; rests count as 1.3 MET. Every number on screen says "est.". No weight entered, no number shown. |

## Food

- Habits only: water, a meal journal, protein and vegetables. No calorie targets.
- Pregnant, under 18, or a medical condition that affects food: the food card
  only refers to a dietitian or doctor (`foodCard()` in `js/app.js`). No water
  card either (`waterCard()`: its 8 glasses are a goal), and no lesson of the
  day about food or drink (`food: true` in `LESSONS`, `lessonCard()`).
  `atRisk()` decides: pregnant, maybe under 18 (born 18 years ago or later, or
  no profile yet), a PAR-Q heart, chronic, medicine or supervised yes, or the
  food card's own switches.
- Frank is trained in sports nutrition; personal food plans come from him, not the app.

## Not settled by the evidence (don't present as fact)

- Exact reps-in-reserve targets [5, 10].
- Interval timings such as 30 s on / 10 s off [14]: conventions.
- Whether crunches harm healthy spines [28]: contested; keep volume moderate.
- Short bursts of vigorous activity and mortality [34]: observational.
