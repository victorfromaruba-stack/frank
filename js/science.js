/* Wellness by Frank: the evidence behind the generated plans, shown on the science screen.
   Every rule cites sources by number. Checked 2 October 2026. Viana 2019 (HIIT and fat loss)
   was retracted in 2020 and is not used. Keep in step with
   .claude/skills/frank-app/references/science.md. */
(function (W) {
  'use strict';
  var doi = function (d) { return 'https://doi.org/' + d; };
  W.WBF.SCIENCE = {
    intro: 'Members get plans built by the app, not by guesswork. These are the rules it follows and the research behind each one. Where the evidence is thin, we say so.',
    sections: [
      { title: 'How much to move',
        rules: [
          { text: 'Adults: 150 to 300 minutes of moderate activity a week, or 75 to 150 minutes of vigorous activity. A vigorous minute counts as two moderate ones.', src: [1, 2] },
          { text: 'Strength work for all major muscles on at least two days a week.', src: [1, 3] },
          { text: 'From 65: add balance and strength work on at least three days a week.', src: [1] },
          { text: 'Every bout counts, however short. Short bursts of vigorous effort during the day are linked to lower mortality, though those studies are observational.', src: [1, 34] }
        ],
        app: 'The moving-minutes card counts your workouts and walks toward 150 minutes a week (250 if you want to lose fat). Plans train every muscle at least twice a week.' },
      { title: 'How much strength work',
        rules: [
          { text: 'Any resistance training beats none. Train each major muscle at least twice a week.', src: [5, 6] },
          { text: 'About 10 or more hard sets per muscle a week grows muscle; gains flatten out near 18 to 20 sets.', src: [5, 7, 8] },
          { text: 'Sets don\'t need to go to failure. Stopping two or three reps short works, and may be wiser for older adults. Exact reps-in-reserve targets are not proven.', src: [5, 10] },
          { text: 'Muscle grows with light or heavy loads if the set ends near failure, roughly 6 to 30 reps. Past about 30 reps, a harder version of the move works better.', src: [9, 10] },
          { text: 'Bodyweight works: push-ups matched bench press for strength and muscle in trials.', src: [11, 12] }
        ],
        app: 'Beginners do 2 rounds of 8 to 15 reps, intermediates 2 to 3 rounds, advanced 3 to 4. Every set stops with two or three good reps left. The body parts you pick as your focus get a short extra block at the end of plan sessions: more weekly sets where you want them.' },
      { title: 'How plans progress',
        rules: [
          { text: 'Add reps first, then move to a harder variation once every set beats the top of the range. Adding reps works as well as adding load.', src: [15, 4] },
          { text: 'Push-ups have a ladder: hands on a high box are about 41% of body weight, knees 49%, a low box 55%, the floor 64%, feet raised 70 to 74%.', src: [16] },
          { text: 'Aerobic work: add 5 to 10 minutes a session every one to two weeks at the start.', src: [3] }
        ],
        app: 'Each week of the 28-day plan asks about 10% more. Your answer to "How did that feel?" turns the next sessions up or down. After four weeks a new block starts a step harder.' },
      { title: 'Rest and circuits',
        rules: [
          { text: 'For strength, 2 to 3 minutes between sets of the same muscle; for beginners 60 to 120 seconds is enough. For growth, more than 60 seconds helps a little, past 90 adds nothing.', src: [13] },
          { text: 'Circuits that rotate push, legs, pull and core let each muscle rest while the others work. Circuit training improves strength and fitness and halves the time. Station timings like 30 s on, 10 s off are conventions, not tested optimums.', src: [14] }
        ],
        app: 'Sessions are circuits: 15 to 30 seconds to change over, a longer break between rounds, so each muscle gets well over a minute between its sets.' },
      { title: 'Warming up and cooling down',
        rules: [
          { text: 'A 5 to 10 minute warm-up improves performance in most studies: light cardio, moving through range, then easy reps of what comes next.', src: [17] },
          { text: 'Long static stretches before training cost a little strength; holds under 60 seconds per muscle barely matter.', src: [18] },
          { text: 'An active cool-down doesn\'t reduce soreness or injury. It\'s optional.', src: [19] }
        ],
        app: 'Every session starts with two or three easy moves. Pre-workout stretches are held 30 seconds or less. The short cool-down is there because it feels good.' },
      { title: 'Intervals and fat loss',
        rules: [
          { text: 'Interval training raises fitness (VO2max) slightly more than steady cardio, in less time.', src: [20] },
          { text: 'For fat loss, intervals and steady cardio do about the same; intervals just take less time.', src: [21] },
          { text: 'Exercise alone takes off about 1.5 to 3.5 kg; adding a diet takes off more. Strength training protects muscle while you lose fat.', src: [23] },
          { text: 'A realistic pace is about 0.5 to 1% of body weight a week; slower keeps more muscle. Around 1.6 g of protein per kg a day helps keep it.', src: [24, 25] },
          { text: 'The "7,700 kcal is a kilo" rule overstates long-term loss.', src: [36] }
        ],
        app: 'Fat-loss plans keep at least two strength days and at most two interval days, and count walks toward 250 minutes. Target-weight dates use 0.5 to 1% a week.' },
      { title: 'Balance and getting older',
        rules: [
          { text: 'Exercise cuts falls in older adults by about a quarter; balance plus strength work by about a third. Walking alone doesn\'t prevent falls.', src: [26] },
          { text: 'Older adults: balance work at least three times a week.', src: [1] }
        ],
        app: 'From 60, every session starts with a balance drill and the plan stays low impact.' },
      { title: 'Core and back',
        rules: [
          { text: 'Exercise reduces chronic low-back pain. "Core stability" work is no better than other exercise.', src: [27] },
          { text: 'Holds that resist movement (plank, side plank, bird dog, dead bug) load the spine lightly. This rests on biomechanics more than outcome trials.', src: [28] },
          { text: 'The worry about crunches comes from animal spines bent tens of thousands of times; it\'s contested. Keep crunch volume moderate, and skip them with disc-type back pain.', src: [28] }
        ],
        app: 'If you mark your lower back as sore, crunches, leg raises, V-ups and back extensions are swapped for back-friendly moves.' },
      { title: 'Recovery and sleep',
        rules: [
          { text: 'Leave at least 48 hours before training the same muscles hard again.', src: [3] },
          { text: 'Sleep at least 7 hours. Short sleep lowers performance.', src: [29] }
        ],
        app: 'Plans put a rest day or a different body part between hard sessions for the same muscles.' },
      { title: 'Safety first',
        rules: [
          { text: 'The PAR-Q+ (2025) asks seven questions. Any yes means checking with a doctor or qualified professional before vigorous activity.', src: [30] },
          { text: 'Stop and get checked if you feel chest, jaw or arm discomfort, breathlessness on light effort, dizziness or fainting, palpitations, or unusual tiredness.', src: [31] },
          { text: 'Intervals are safe in supervised cardiac rehab, but risk is higher than with moderate work, so screening comes first.', src: [22] }
        ],
        app: 'The health check uses the PAR-Q+ questions. Any yes keeps the plan gentle (no jumping, nothing vigorous) until you tell the app you\'ve been cleared.' },
      { title: 'Pregnancy',
        rules: [
          { text: 'At least 150 minutes a week of moderate activity over three days or more, strength work included, with pelvic-floor training. Already active? Vigorous training can continue.', src: [1, 35] },
          { text: 'After the first trimester, avoid exercising flat on your back; avoid contact, falls and heat. Stop for bleeding, fluid loss, contractions, dizziness, chest pain or calf swelling.', src: [1, 35] }
        ],
        app: 'Pregnancy mode leaves out lying on the back or front, jumping, the balance pad and the rings. Talk to your midwife or doctor first.' },
      { title: 'Calories',
        rules: [
          { text: 'Energy per minute = MET x 3.5 x body weight in kg / 200, using the 2024 Compendium of Physical Activities. From 60, 2.7 replaces 3.5.', src: [32, 33] },
          { text: 'These are population averages. Your real number can be quite different.', src: [32] }
        ],
        app: 'Calories are always marked "est." Rest periods count at 1.3 MET.' }
    ],
    sources: [
      { n: 1, label: 'Bull et al. (2020). WHO 2020 guidelines on physical activity and sedentary behaviour. Br J Sports Med.', url: doi('10.1136/bjsports-2020-102955') },
      { n: 2, label: 'World Health Organization (2020). Guidelines on physical activity and sedentary behaviour.', url: 'https://www.who.int/publications/i/item/9789240015128' },
      { n: 3, label: 'Garber et al. (2011). ACSM position stand: quantity and quality of exercise. Med Sci Sports Exerc.', url: doi('10.1249/MSS.0b013e318213fefb') },
      { n: 4, label: 'ACSM (2009). Progression models in resistance training for healthy adults. Med Sci Sports Exerc.', url: doi('10.1249/MSS.0b013e3181915670') },
      { n: 5, label: 'Currier et al. (2026). ACSM position stand on resistance training. Med Sci Sports Exerc.', url: doi('10.1249/MSS.0000000000003897') },
      { n: 6, label: 'Schoenfeld et al. (2016). Training frequency and muscle hypertrophy: a meta-analysis. Sports Med.', url: doi('10.1007/s40279-016-0543-8') },
      { n: 7, label: 'Schoenfeld et al. (2017). Weekly sets and muscle mass: a dose-response meta-analysis. J Sports Sci.', url: doi('10.1080/02640414.2016.1210197') },
      { n: 8, label: 'Pelland et al. (2026). Resistance training volume and strength and hypertrophy. Sports Med.', url: doi('10.1007/s40279-025-02344-w') },
      { n: 9, label: 'Lasevicius et al. (2018). Effects of different training loads on muscle hypertrophy. Eur J Sport Sci.', url: doi('10.1080/17461391.2018.1450898') },
      { n: 10, label: 'Robinson et al. (2024). Proximity to failure and muscle hypertrophy and strength. Sports Med.', url: doi('10.1007/s40279-024-02069-2') },
      { n: 11, label: 'Kikuchi & Nakazato (2017). Push-up vs bench press training. J Exerc Sci Fit.', url: doi('10.1016/j.jesf.2017.06.003') },
      { n: 12, label: 'Calatayud et al. (2015). Bench press and push-ups at comparable muscle activity. J Strength Cond Res.', url: doi('10.1519/JSC.0000000000000589') },
      { n: 13, label: 'Grgic et al. (2018). Rest intervals between sets and muscular strength: a systematic review. Sports Med.', url: doi('10.1007/s40279-017-0788-x') },
      { n: 14, label: 'Muñoz-Martínez et al. (2017). Circuit training on muscle strength and fitness: a meta-analysis. Sports Med.', url: doi('10.1007/s40279-017-0773-4') },
      { n: 15, label: 'Plotkin et al. (2022). Progressive overload with load vs repetitions. PeerJ.', url: doi('10.7717/peerj.14142') },
      { n: 16, label: 'Ebben et al. (2011). Kinetic analysis of push-up variations. J Strength Cond Res.', url: doi('10.1519/JSC.0b013e31820c8587') },
      { n: 17, label: 'Fradkin et al. (2010). Effects of warming-up on physical performance: a meta-analysis. J Strength Cond Res.', url: doi('10.1519/JSC.0b013e3181c643a0') },
      { n: 18, label: 'Behm et al. (2016). Acute effects of muscle stretching on performance. Appl Physiol Nutr Metab.', url: doi('10.1139/apnm-2015-0235') },
      { n: 19, label: 'Van Hooren & Peake (2018). Do we need a cool-down after exercise? Sports Med.', url: doi('10.1007/s40279-018-0916-2') },
      { n: 20, label: 'Milanović et al. (2015). HIIT vs continuous training and VO2max: a meta-analysis. Sports Med.', url: doi('10.1007/s40279-015-0365-0') },
      { n: 21, label: 'Wewege et al. (2017). HIIT vs moderate training for body composition: a meta-analysis. Obes Rev.', url: doi('10.1111/obr.12532') },
      { n: 22, label: 'Rognmo et al. (2012). Cardiovascular risk of high- vs moderate-intensity training. Circulation.', url: doi('10.1161/CIRCULATIONAHA.112.123117') },
      { n: 23, label: 'Bellicha et al. (2021). Exercise training in weight management: an overview of reviews. Obes Rev.', url: doi('10.1111/obr.13256') },
      { n: 24, label: 'Garthe et al. (2011). Weight-loss rate and body composition in athletes. Int J Sport Nutr Exerc Metab.', url: doi('10.1123/ijsnem.21.2.97') },
      { n: 25, label: 'Morton et al. (2018). Protein supplementation and resistance-training gains: a meta-analysis. Br J Sports Med.', url: doi('10.1136/bjsports-2017-097608') },
      { n: 26, label: 'Sherrington et al. (2019). Exercise for preventing falls in older people. Cochrane Review.', url: doi('10.1002/14651858.CD012424.pub2') },
      { n: 27, label: 'Hayden et al. (2021). Exercise therapy for chronic low back pain. Cochrane Review.', url: doi('10.1002/14651858.CD009790.pub2') },
      { n: 28, label: 'McGill (2010). Core training: evidence translating to better performance and injury prevention. Strength Cond J.', url: doi('10.1519/SSC.0b013e3181df4521') },
      { n: 29, label: 'Watson et al. (2015). Recommended amount of sleep for a healthy adult. Sleep.', url: doi('10.5665/sleep.4716') },
      { n: 30, label: 'PAR-Q+ Collaboration (2025). The Physical Activity Readiness Questionnaire for Everyone.', url: 'https://eparmedx.com/wp-content/uploads/2025/01/PARQPlus2025Fillable.pdf' },
      { n: 31, label: 'Riebe et al. (2015). Updating ACSM\'s recommendations for exercise preparticipation health screening. Med Sci Sports Exerc.', url: doi('10.1249/MSS.0000000000000664') },
      { n: 32, label: 'Herrmann et al. (2024). 2024 Adult Compendium of Physical Activities. J Sport Health Sci.', url: doi('10.1016/j.jshs.2023.10.010') },
      { n: 33, label: 'Willis et al. (2024). Older Adult Compendium of Physical Activities. J Sport Health Sci.', url: doi('10.1016/j.jshs.2023.10.007') },
      { n: 34, label: 'Stamatakis et al. (2022). Vigorous intermittent lifestyle activity and mortality. Nat Med.', url: doi('10.1038/s41591-022-02100-x') },
      { n: 35, label: 'Mottola et al. (2018). Canadian guideline for physical activity throughout pregnancy. Br J Sports Med.', url: doi('10.1136/bjsports-2018-100056') },
      { n: 36, label: 'Hall et al. (2011). Quantification of the effect of energy imbalance on bodyweight. Lancet.', url: doi('10.1016/S0140-6736(11)60812-X') }
    ]
  };
})(window);
