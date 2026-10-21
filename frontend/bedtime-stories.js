const story = {
  'star-start': {
    label: 'CHAPTER ONE · A TINY TWINKLE',
    title: 'The little light in the grass',
    text: 'One velvet-blue evening, Pip found a tiny star nestled in the nursery grass. It gave a shy little shimmer. “I slipped from the sky,” it whispered. Pip cupped it gently. “We’ll find just the right place for you.”',
    motif: 'star',
    choices: [
      { label: 'Follow the silver path uphill', next: 'star-hill' },
      { label: 'Listen for someone missing a light', next: 'star-cloud' },
    ],
  },
  'star-hill': {
    label: 'CHAPTER TWO · ABOVE THE CLOUDS',
    title: 'A choice beneath the moon',
    text: 'Pip and the star climbed until the clouds looked like soft quilts below. The star remembered its old constellation, but it also loved the calm garden glowing beneath them. It hummed, waiting for Pip to choose.',
    motif: 'star',
    choices: [
      { label: 'Help the star find its place in the sky', next: 'star-home' },
      { label: 'Give the star a home in the garden', next: 'star-garden' },
    ],
  },
  'star-cloud': {
    label: 'CHAPTER TWO · A QUIET WISH',
    title: 'The cloud who missed the stars',
    text: 'A small cloud drifted close. “I miss the stars that used to keep me company,” it sighed. The little star glowed warmly in Pip’s hands. “Perhaps we can help you feel less alone,” said Pip.',
    motif: 'star',
    choices: [
      { label: 'Let the star stay as a gentle night-light', next: 'star-nightlight' },
      { label: 'Ask the cloud to carry the star home', next: 'star-home' },
    ],
  },
  'star-home': {
    label: 'THE END · HOME IN THE HEAVENS',
    title: 'A star finds its way home',
    text: 'Pip lifted the little star to the open sky. It floated upward, brighter with every breath, until it slipped into its old place among the constellations. A silver beam swept across the clouds. Far below, Pip waved goodnight.',
    motif: 'star',
    ending: true,
  },
  'star-garden': {
    label: 'THE END · A GARDEN OF LIGHT',
    title: 'A new flower for the night',
    text: 'Pip tucked the star into a patch of moon-soft earth. By morning, a tiny golden flower had opened there, its petals glowing like a very small sunrise. The star had found a new home, and the garden had a wonder of its own.',
    motif: 'star',
    ending: true,
  },
  'star-nightlight': {
    label: 'THE END · A FRIENDLY GLOW',
    title: 'The cloud’s little night-light',
    text: 'The star settled beside the cloud, shining softly—not too bright, just enough. Together they watched the moon sail by. The cloud curled around its new friend and drifted into the gentlest sleep. Pip smiled and tiptoed home.',
    motif: 'star',
    ending: true,
  },
  'lumi-start': {
    label: 'CHAPTER ONE · LUMI’S WISH',
    title: 'A light that wanted to help',
    text: 'Lumi was a little garden light with a wish: she wanted every flower to feel safe after sunset. Yet the more she tried to shine everywhere at once, the dimmer she became. Pip sat beside her until the worry softened.',
    motif: 'wish',
    next: 'lumi-question',
  },
  'lumi-question': {
    label: 'CHAPTER TWO · THE WISH BENEATH THE WISH',
    title: 'What did the flowers need?',
    text: '“Maybe they do not need one enormous light,” Pip wondered. The garden grew quiet enough for them to hear two things: moonflowers were waiting in the open meadow, and tiny seedlings were tucked beneath the lavender leaves.',
    motif: 'wish',
    choices: [
      { label: 'Guide Lumi to the waiting moonflowers', next: 'lumi-meadow' },
      { label: 'Listen for the seedlings beneath the leaves', next: 'lumi-seedlings' },
    ],
  },
  'lumi-meadow': {
    label: 'CHAPTER THREE · A KINDNESS SHARED',
    title: 'A path of little lanterns',
    text: 'Pip placed small reflective shells along the meadow path. Lumi rested at each one, sharing a gentle glimmer instead of spending all her light at once. The moonflowers opened one by one, each catching enough silver to find its way.',
    motif: 'wish',
    next: 'lumi-meadow-ending',
  },
  'lumi-seedlings': {
    label: 'CHAPTER THREE · A QUIET CORNER',
    title: 'Light for the smallest leaves',
    text: 'Under the lavender, the seedlings were too small to reach the moonlight. Lumi bent low and shone just where they needed her. Pip made a little ring of smooth stones so she could rest between each soft beam.',
    motif: 'wish',
    next: 'lumi-seedlings-ending',
  },
  'lumi-meadow-ending': {
    label: 'THE END · THE MEADOW GLOWS',
    title: 'A wish bright enough to share',
    text: 'By midnight, the meadow was dotted with calm, silvery blooms. Lumi was still glowing because she had not tried to do everything alone. “My wish came true when we helped together,” she whispered. Pip wished her a peaceful goodnight.',
    motif: 'wish',
    ending: true,
  },
  'lumi-seedlings-ending': {
    label: 'THE END · A GARDEN GROWS',
    title: 'Small lights make a beginning',
    text: 'The seedlings lifted their first leaves toward Lumi’s steady glow. Tomorrow they would grow a little taller, and the next night they could share some light of their own. Lumi’s wish had become a beginning, not a burden.',
    motif: 'wish',
    ending: true,
  },
  'music-start': {
    label: 'CHAPTER ONE · A QUIET MELODY',
    title: 'The sleeping music box',
    text: 'Pip found a little music box beneath a fern. Its painted moon had faded and its key had stopped turning. Still, inside came the faintest note, as if a melody were dreaming. Pip carried it carefully to the nursery steps.',
    motif: 'music',
    next: 'music-clue',
  },
  'music-clue': {
    label: 'CHAPTER TWO · A NOTE IN THE NIGHT',
    title: 'Who was the song for?',
    text: 'A paper tucked beneath the box said, “For anyone who needs a little comfort.” Pip heard two possible beginnings for the tune: the slow patter of rain on leaves, and the warm hum of a lullaby remembered by the garden.',
    motif: 'music',
    choices: [
      { label: 'Begin with the soft rhythm of rain', next: 'music-rain' },
      { label: 'Begin with a quiet, humming tune', next: 'music-hum' },
    ],
  },
  'music-rain': {
    label: 'CHAPTER THREE · THE RAIN’S RHYTHM',
    title: 'A tune that takes its time',
    text: 'Pip tapped a slow pattern on the music box: drip, pause, drip-drip. The old gears turned a little more easily. Outside, the leaves answered with their own soft percussion, and a sleepy friend stirred beneath the fern.',
    motif: 'music',
    next: 'music-rain-ending',
  },
  'music-hum': {
    label: 'CHAPTER THREE · A REMEMBERED HUM',
    title: 'A melody shared by friends',
    text: 'Pip hummed one warm note. The music box answered with another, then another. Lumi and Pippa joined in quietly until the forgotten melody returned—not perfectly, but gently enough to make the nursery feel close and safe.',
    motif: 'music',
    next: 'music-hum-ending',
  },
  'music-rain-ending': {
    label: 'THE END · A SONG FOR SLEEP',
    title: 'The garden remembers',
    text: 'The rain-like tune floated over the garden. A friend who had been worried all evening nestled beneath the fern and listened until the last note faded. Pip closed the music box, and the nursery settled into a peaceful hush.',
    motif: 'music',
    ending: true,
  },
  'music-hum-ending': {
    label: 'THE END · A SONG HELD TOGETHER',
    title: 'The melody finds its home',
    text: 'When the friends hummed the final note together, the music box glowed with a warm amber light. The song had been waiting for company. Pip wound the key once more, and everyone drifted toward sleep with the tune in their hearts.',
    motif: 'music',
    ending: true,
  },
  'lantern-start': {
    label: 'CHAPTER ONE · A DIM GARDEN',
    title: 'A lantern in the grass',
    text: 'The garden path was dim beneath the sleeping trees. Pip found a little lantern and lit it. Its warm circle reached the flowers and revealed a winding silver path. Somewhere beyond the hedge, a small voice called for help.',
    motif: 'lantern',
    next: 'lantern-crossroads',
  },
  'lantern-crossroads': {
    label: 'CHAPTER TWO · TWO QUIET CLUES',
    title: 'How should Pip find the voice?',
    text: 'At the fork in the path, Pip spotted fireflies drifting toward the old fountain. From the other side came a faint “hello” between the leaves. The lantern had enough light for one careful route at a time.',
    motif: 'lantern',
    choices: [
      { label: 'Follow the fireflies to the fountain', next: 'lantern-fireflies' },
      { label: 'Answer the voice beyond the leaves', next: 'lantern-call' },
    ],
  },
  'lantern-fireflies': {
    label: 'CHAPTER THREE · THE FOUNTAIN PATH',
    title: 'A trail of tiny lights',
    text: 'The fireflies did not rush ahead. They paused at every turn so Pip could keep up. By the old fountain, Pip found a line of pawprints in the soft earth, leading toward the voice.',
    motif: 'lantern',
    next: 'lantern-friend',
  },
  'lantern-call': {
    label: 'CHAPTER THREE · A FRIENDLY ANSWER',
    title: 'A voice answers back',
    text: 'Pip called, “I’m here, and I have a light.” The voice answered with a relieved little chirp. Following the sound, Pip found a loose gate latch and a familiar trail of pawprints beside it.',
    motif: 'lantern',
    next: 'lantern-friend',
  },
  'lantern-friend': {
    label: 'CHAPTER FOUR · BEYOND THE HEDGE',
    title: 'A friend beside the garden gate',
    text: 'Pip found Pippa waiting beside a shadowy hedge. She had taken a wrong turn while gathering fallen petals and could not see the gate. The lantern showed the familiar flower beds and the safe path home.',
    motif: 'lantern',
    next: 'lantern-ending',
  },
  'lantern-ending': {
    label: 'THE END · THE WAY HOME',
    title: 'A friend finds the path',
    text: 'Together they followed the warm circle of light back to the nursery gate. Pippa thanked Pip, and the lantern was set beside the flowers for another night. The garden no longer seemed dark; it was full of quiet places to belong.',
    motif: 'lantern',
    ending: true,
  },
  'lights-start': {
    label: 'CHAPTER ONE · LITTLE LIGHTS',
    title: 'A gathering in the garden',
    text: 'Pip followed tiny lights to a moonlit clearing. Lumi, Pippa, and a sleepy fox were there, each carrying a glow of their own. They wanted to make a beautiful canopy, but their lights kept drifting apart.',
    motif: 'lights',
    next: 'lights-challenge',
  },
  'lights-challenge': {
    label: 'CHAPTER TWO · MAKING ROOM',
    title: 'Every light has its own rhythm',
    text: 'Lumi shone in quick sparks, Pippa glowed steadily, and the fox’s light pulsed slowly with each breath. The friends wondered how they could shine together without asking anyone to change.',
    motif: 'lights',
    choices: [
      { label: 'Arrange the lights around the flowers', next: 'lights-circle' },
      { label: 'Follow the fox’s slow, sleepy rhythm', next: 'lights-rhythm' },
    ],
  },
  'lights-circle': {
    label: 'CHAPTER THREE · A WIDE CIRCLE',
    title: 'A place for every glow',
    text: 'Pip and Pippa left a little space between each flower. Lumi’s quick sparks could dance, the fox’s light could rest, and no glow had to compete with another. The clearing began to look like a gentle constellation.',
    motif: 'lights',
    next: 'lights-circle-ending',
  },
  'lights-rhythm': {
    label: 'CHAPTER THREE · A SLOW SONG',
    title: 'Shining side by side',
    text: 'The friends breathed in and out with the fox. Lumi’s sparks softened, Pippa’s glow kept time, and the little lights rose and fell together. The garden seemed to hum along with their quiet rhythm.',
    motif: 'lights',
    next: 'lights-rhythm-ending',
  },
  'lights-circle-ending': {
    label: 'THE END · EVERY LIGHT BELONGS',
    title: 'A canopy with room for all',
    text: 'The friends placed their lights around the flowers and made a wide, starry canopy. No single light was brightest. The magic came from leaving room for each one to shine in its own way. Pip wished everyone a soft goodnight.',
    motif: 'lights',
    ending: true,
  },
  'lights-rhythm-ending': {
    label: 'THE END · A SHARED GOODNIGHT',
    title: 'The garden keeps their gentle beat',
    text: 'One by one, the friends settled beneath the canopy they had made together. Their lights still glimmered at different rhythms, but they no longer felt far apart. The garden held every little glow until morning.',
    motif: 'lights',
    ending: true,
  },
  'ember-start': { label: 'CHAPTER ONE · A BRAVE LITTLE GLOW', title: 'Ember’s brave glow', text: 'Ember was a tiny firefly whose warm light flickered whenever the wind sighed through the midnight garden. One evening, the moths’ path home grew dim. Pip sat beside Ember and waited until the little glow felt ready to shine again.', motif: 'wish', next: 'ember-choice' },
  'ember-choice': { label: 'CHAPTER TWO · TWO WAYS TO HELP', title: 'A brave glow can begin small', text: 'The breeze had quieted, but the garden still held many shadows. Pip and Ember noticed two places that could use a little light: a row of sleepy flowers and the stepping stones near the pond.', motif: 'wish', choices: [{ label: 'Light the flower path together', next: 'ember-flowers' }, { label: 'Guide the moths across the pond', next: 'ember-pond' }] },
  'ember-flowers': { label: 'CHAPTER THREE · ONE FLOWER AT A TIME', title: 'A path of gentle glimmers', text: 'Ember hovered beside the first flower and let one calm spark glow. Pip stayed close while Ember rested between each bloom. Soon the petals reflected the light, making a welcoming path without asking Ember to shine too brightly.', motif: 'wish', next: 'ember-flower-ending' },
  'ember-pond': { label: 'CHAPTER THREE · OVER THE STILL WATER', title: 'A light the moths could follow', text: 'Pip held the lantern low while Ember drifted from stone to stone. The moths followed the little gold glow across the quiet pond, pausing whenever Ember needed a breath. Their wings shimmered softly above the water.', motif: 'wish', next: 'ember-pond-ending' },
  'ember-flower-ending': { label: 'THE END · A COURAGEOUS GLOW', title: 'Brave enough, just as you are', text: 'When every flower had a gentle glimmer, Ember smiled. The moths found their way, and Ember learned that brave did not mean never feeling afraid. It meant taking one small, kind step with a friend nearby.', motif: 'wish', ending: true },
  'ember-pond-ending': { label: 'THE END · HOME BY THE POND', title: 'A little light leads the way', text: 'The moths reached the far bank and circled Ember in a grateful dance. Ember’s glow was still small, but it had been exactly enough. Pip and Ember watched the pond settle back into its moonlit hush.', motif: 'wish', ending: true },
  'nova-start': { label: 'CHAPTER ONE · NOVA’S QUIET PACE', title: 'Nova’s slow and steady day', text: 'Nova the little snail wanted to carry a moonflower seed to the hilltop garden. The path looked long, and the other garden friends hurried past. Pip reminded Nova that every careful step still moved the seed toward its home.', motif: 'lights', next: 'nova-choice' },
  'nova-choice': { label: 'CHAPTER TWO · A COMFORTABLE RHYTHM', title: 'How shall Nova continue?', text: 'At the first bend, Nova found a smooth stepping-stone path and a quiet patch of moss beside it. The seed was safe in Nova’s leaf basket. There was time to choose a pace that felt good.', motif: 'lights', choices: [{ label: 'Follow the stepping stones slowly', next: 'nova-stones' }, { label: 'Pause for a little rest first', next: 'nova-rest' }] },
  'nova-stones': { label: 'CHAPTER THREE · STEP BY STEP', title: 'The hill comes closer', text: 'Nova crossed one stone, then another, stopping to watch the moonlight ripple in each puddle. Pip walked alongside without rushing. By the time they reached the hill, the seed had not spilled once.', motif: 'lights', next: 'nova-stones-ending' },
  'nova-rest': { label: 'CHAPTER THREE · A PAUSE UNDER THE FERN', title: 'Rest belongs in the journey', text: 'Nova rested beneath a fern while Pip told a quiet story about the stars. After a while, Nova felt ready to continue. The hill was still there, and the seed was still safe.', motif: 'lights', next: 'nova-rest-ending' },
  'nova-stones-ending': { label: 'THE END · A SEED REACHES HOME', title: 'Slow and steady is a lovely way', text: 'Nova planted the moonflower seed on the hilltop. Pip and Nova watched the first tiny leaf uncurl in the silver light. Their careful journey had brought a new flower to the garden.', motif: 'lights', ending: true },
  'nova-rest-ending': { label: 'THE END · THERE IS TIME', title: 'The garden waited kindly', text: 'After their rest, Nova carried the seed to the hilltop and planted it beside the path. Pip stayed for a little while as the moonflowers opened. Nova had arrived in a way that felt just right.', motif: 'lights', ending: true },
  'mochi-start': { label: 'CHAPTER ONE · A PEACEFUL PLACE', title: 'Mochi finds a quiet corner', text: 'Mochi the small garden friend felt overwhelmed by the busy nursery: rustling leaves, fluttering moths, and many cheerful hellos. Pip noticed Mochi growing quiet and asked if they would like to find a calmer place together.', motif: 'music', next: 'mochi-choice' },
  'mochi-choice': { label: 'CHAPTER TWO · WHAT FEELS COMFORTING?', title: 'Two gentle ways to settle', text: 'A soft moonlit nook waited beneath the willow, and a sheltered flower patch rested near the fountain. Mochi could choose whichever place felt safest. Pip promised they could take their time getting there.', motif: 'music', choices: [{ label: 'Visit the willow nook', next: 'mochi-willow' }, { label: 'Find the sheltered flowers', next: 'mochi-flowers' }] },
  'mochi-willow': { label: 'CHAPTER THREE · UNDER THE WILLOW', title: 'A quiet nook with soft leaves', text: 'The willow branches made a little roof over the grass. Mochi listened to the leaves sway and breathed slowly with Pip. The nursery sounds were still nearby, but here they felt gentle and far away.', motif: 'music', next: 'mochi-willow-ending' },
  'mochi-flowers': { label: 'CHAPTER THREE · BESIDE THE FLOWERS', title: 'A sheltered place to rest', text: 'The flower patch was warm with the last golden glow of the lantern. Mochi settled beside a soft cushion of moss while Pip left plenty of quiet space. A sleepy moth kept watch from a nearby leaf.', motif: 'music', next: 'mochi-flowers-ending' },
  'mochi-willow-ending': { label: 'THE END · PEACE UNDER THE WILLOW', title: 'A safe place to be still', text: 'Mochi felt calm enough to watch the moon peek through the willow leaves. The busy nursery could wait until tomorrow. Pip stayed close, and together they enjoyed a peaceful little silence.', motif: 'music', ending: true },
  'mochi-flowers-ending': { label: 'THE END · A GENTLE GOODNIGHT', title: 'Comfort grows in a quiet corner', text: 'Mochi curled beside the flowers as their petals folded for the night. The lantern glow was soft, the moss was cozy, and Pip was nearby. Mochi felt safe and ready for a peaceful sleep.', motif: 'music', ending: true },
  'pippa-start': { label: 'CHAPTER ONE · PIPPA’S SONG', title: 'A song tucked among the stars', text: 'Pippa the rabbit loved to hum while gathering petals, but tonight her favorite melody would not come. The stars seemed very far away. Pip sat beside her on the garden hill and listened without hurrying her.', motif: 'star', next: 'pippa-choice' },
  'pippa-choice': { label: 'CHAPTER TWO · FINDING THE FIRST NOTE', title: 'Where might the song begin?', text: 'Pippa remembered two parts of the tune: the soft rhythm of petals falling into her basket, and a bright note she once heard beside the old bellflower. Either memory might help her find the melody again.', motif: 'star', choices: [{ label: 'Listen to the petal rhythm', next: 'pippa-petals' }, { label: 'Follow the bellflower’s bright note', next: 'pippa-bellflower' }] },
  'pippa-petals': { label: 'CHAPTER THREE · A RHYTHM RETURNS', title: 'Petals keep a gentle beat', text: 'Pippa tapped her paw against the basket: soft, soft, pause. Pip joined in, and the familiar rhythm brought back the first few notes. The melody began to feel close again.', motif: 'star', next: 'pippa-petals-ending' },
  'pippa-bellflower': { label: 'CHAPTER THREE · THE BELLFLOWER’S NOTE', title: 'A little star hears the song', text: 'The bellflower chimed when the breeze touched its silver petals. Pippa hummed along, and one bright star seemed to twinkle in time. The tune returned, gentle as a whisper across the hill.', motif: 'star', next: 'pippa-bellflower-ending' },
  'pippa-petals-ending': { label: 'THE END · A SONG SHARED', title: 'The melody finds its way home', text: 'Pippa sang the whole tune while Pip kept the petal rhythm. The stars no longer felt far away; they seemed to listen from above the garden. Pippa smiled and carried her song home for tomorrow.', motif: 'star', ending: true },
  'pippa-bellflower-ending': { label: 'THE END · SONG IN THE STARS', title: 'A melody beneath the moon', text: 'Pippa finished her song beneath the bright bellflower. The star above answered with a gentle shimmer. Pip and Pippa watched it glow for a moment, then headed home with the melody safe in their hearts.', motif: 'star', ending: true },
};

const adventures = {
  'missing-star': {
    title: 'Pip and the Missing Star',
    description: 'Pip helps a tiny fallen star find a home among the sky, clouds, or garden.',
    motif: 'star',
    start: 'star-start',
    group: 'main',
    scenes: ['star-start', 'star-hill', 'star-cloud', 'star-home', 'star-garden', 'star-nightlight'],
  },
  'lumi-wish': {
    title: 'Lumi’s Shimmering Wish',
    description: 'A little light discovers how helping others can bring a wish to life.',
    motif: 'wish',
    start: 'lumi-start',
    group: 'friends',
    scenes: ['lumi-start', 'lumi-question', 'lumi-meadow', 'lumi-seedlings', 'lumi-meadow-ending', 'lumi-seedlings-ending'],
  },
  'music-box': {
    title: 'The Sleeping Music Box',
    description: 'Pip follows an old melody to discover who needs its gentle comfort.',
    motif: 'music',
    start: 'music-start',
    group: 'main',
    scenes: ['music-start', 'music-clue', 'music-rain', 'music-hum', 'music-rain-ending', 'music-hum-ending'],
  },
  'lantern-path': {
    title: 'The Lantern Path',
    description: 'Pip follows the lantern’s warm light to help a lost friend find home.',
    motif: 'lantern',
    start: 'lantern-start',
    group: 'main',
    scenes: ['lantern-start', 'lantern-crossroads', 'lantern-fireflies', 'lantern-call', 'lantern-friend', 'lantern-ending'],
  },
  'little-lights': {
    title: 'The Garden of Little Lights',
    description: 'Pip and the Garden Friends discover how all their little lights belong together.',
    motif: 'lights',
    start: 'lights-start',
    group: 'main',
    scenes: ['lights-start', 'lights-challenge', 'lights-circle', 'lights-rhythm', 'lights-circle-ending', 'lights-rhythm-ending'],
  },
  'ember-glow': { title: 'Ember’s Brave Glow', description: 'Ember learns that courage can be a small light shared with a friend.', motif: 'wish', group: 'friends', start: 'ember-start', scenes: ['ember-start', 'ember-choice', 'ember-flowers', 'ember-pond', 'ember-flower-ending', 'ember-pond-ending'] },
  'nova-day': { title: 'Nova’s Slow and Steady Day', description: 'Nova finds a comfortable pace for a journey to plant a moonflower seed.', motif: 'lights', group: 'friends', start: 'nova-start', scenes: ['nova-start', 'nova-choice', 'nova-stones', 'nova-rest', 'nova-stones-ending', 'nova-rest-ending'] },
  'mochi-place': { title: 'Mochi’s Peaceful Place', description: 'Mochi and Pip find a gentle, quiet corner where the garden feels safe.', motif: 'music', group: 'friends', start: 'mochi-start', scenes: ['mochi-start', 'mochi-choice', 'mochi-willow', 'mochi-flowers', 'mochi-willow-ending', 'mochi-flowers-ending'] },
  'pippa-song': { title: 'Pippa’s Song in the Stars', description: 'Pippa finds a beloved melody again with a little listening and a friend nearby.', motif: 'star', group: 'friends', start: 'pippa-start', scenes: ['pippa-start', 'pippa-choice', 'pippa-petals', 'pippa-bellflower', 'pippa-petals-ending', 'pippa-bellflower-ending'] },
};

const bedtimeAssets = {
  openingCover: 'assets/bedtime-stories/opening-cover.png',
  stories: Object.fromEntries(Object.entries(adventures).map(([id, adventure]) => [
    id,
    {
      coverImage: 'assets/bedtime-stories/' + ({
        'missing-star': 'cover_pip_missing_star.png',
        'ember-glow': 'cover_ember_brave_glow.png',
        'little-lights': 'cover_garden_little_lights.png',
        'nova-day': 'cover_nova_slow_steady_day.png',
        'mochi-place': 'cover_mochi_peaceful_place.png',
        'pippa-song': 'cover_pippa_song_stars.png',
        'lumi-wish': 'cover_lumi_shimmering_wish.png',
        'lantern-path': 'cover_lantern_path.png',
        'music-box': 'cover_sleeping_music_box.png',
      })[id],
      coverAlt: 'Cover artwork for ' + adventure.title,
      sceneImages: Object.fromEntries(adventure.scenes.map((sceneId) => [sceneId, {
        src: id === 'missing-star'
          ? `assets/bedtime-stories/scenes/scene_${id}_${sceneId}.png`
          : null,
        alt: `Illustration for ${adventure.title}: ${story[sceneId].title}`,
      }])),
      companion: {
        idle: 'Pip is here to tell you a story.',
        walking: 'Pip is walking beside you.',
        celebrating: 'You did it! Pip is so happy you came along for this adventure.',
      },
    },
  ])),
};

function validateStoryCollection(stories, storyCollection) {
  const sceneOwners = new Map();

  for (const [adventureId, adventure] of Object.entries(storyCollection)) {
    if (!adventure.scenes?.includes(adventure.start)) return false;
    if (new Set(adventure.scenes).size !== adventure.scenes.length) return false;

    for (const sceneId of adventure.scenes) {
      const sceneData = stories[sceneId];
      if (!sceneData || sceneOwners.has(sceneId)) return false;
      sceneOwners.set(sceneId, adventureId);

      if (sceneData.ending) {
        if (sceneData.next || sceneData.choices?.length) return false;
        continue;
      }

      const destinations = sceneData.choices?.map((choice) => choice.next) || [sceneData.next];
      if (!destinations.length || destinations.some((destination) => (
        !adventure.scenes.includes(destination) || !stories[destination]
      ))) return false;
    }
  }

  return sceneOwners.size === Object.keys(stories).length;
}

function parseBedtimeRoute(search) {
  const params = new URLSearchParams(search);
  const view = params.get('view');

  if (!view) return { route: { view: 'intro' }, valid: params.size === 0 };
  if (view === 'intro' || view === 'library') {
    return {
      route: { view },
      valid: params.size === 1,
    };
  }
  if (view !== 'reader') return { route: { view: 'library' }, valid: false };

  const storyId = params.get('story');
  const adventure = adventures[storyId];
  if (!adventure) return { route: { view: 'library' }, valid: false };

  const sceneId = params.get('scene') || adventure.start;
  if (!adventure.scenes.includes(sceneId)) return { route: { view: 'library' }, valid: false };

  return {
    route: { view: 'reader', story: storyId, scene: sceneId },
    valid: params.size === 3 && params.has('scene'),
  };
}

function bedtimeRouteSearch(route) {
  const params = new URLSearchParams();
  params.set('view', route.view);
  if (route.view === 'reader') {
    params.set('story', route.story);
    params.set('scene', route.scene);
  }
  return `?${params.toString()}`;
}

if (!validateStoryCollection(story, adventures)) {
  throw new Error('The Bedtime Stories data contains an invalid scene or branch destination.');
}

const storyStorageKey = 'dear-pip-bedtime-story-v1';
const storyVisited = new Set();
const scene = document.querySelector('#bedtimeScene');
const sceneArt = document.querySelector('#bedtimeSceneArt');
const sceneLabel = document.querySelector('#bedtimeSceneLabel');
const sceneTitle = document.querySelector('#bedtimeSceneTitle');
const storyCopy = document.querySelector('#bedtimeStoryCopy');
const choices = document.querySelector('#bedtimeChoices');
const continueButton = document.querySelector('#bedtimeContinue');
const endingMessage = document.querySelector('#bedtimeEndingMessage');
const previousButton = document.querySelector('#bedtimePrevious');
const restartButton = document.querySelector('#bedtimeRestart');
const progressBar = document.querySelector('#bedtimeProgress');
const progressCount = document.querySelector('#bedtimeProgressCount');
const readerStateElement = document.querySelector('#bedtimeReaderState');
const waitingPanel = document.querySelector('#bedtimeWaitingPanel');
const readingPanel = document.querySelector('#bedtimeReadingPanel');
const waitingCopy = document.querySelector('#bedtimeWaitingCopy');
const arrivalCopy = document.querySelector('#bedtimeArrivalCopy');
const beginStoryButton = document.querySelector('#bedtimeBeginStory');
let activeRoute = { view: 'intro' };
let readerState = 'waiting';
let pipReady = false;
let selectedStory = '';
let requestedScene = '';
let localStoryProgress = null;
const completedStories = new Set();
const readerTransitions = {
  waiting: new Set(['waiting', 'greeting']),
  greeting: new Set(['waiting', 'reading']),
  reading: new Set(['waiting', 'reading', 'completed']),
  completed: new Set(['waiting', 'reading']),
};

function setReaderState(next) {
  if (!readerTransitions[readerState]?.has(next)) return false;
  readerState = next;
  readerStateElement.dataset.readerState = next;
  const waiting = next === 'waiting' || next === 'greeting';
  waitingPanel.hidden = !waiting;
  readingPanel.hidden = waiting;
  waitingCopy.hidden = next !== 'waiting';
  arrivalCopy.hidden = next !== 'greeting';
  beginStoryButton.hidden = next !== 'greeting';
  return true;
}

function enterWaitingState() {
  setReaderState('waiting');
  waitingCopy.hidden = false;
  arrivalCopy.hidden = true;
  beginStoryButton.hidden = true;
}

function saveStoryProgress(sceneId) {
  const progress = {
    version: 1,
    adventure: activeRoute.story,
    scene: sceneId,
    visited: [...storyVisited],
    completed: [...completedStories],
  };
  localStoryProgress = progress;
  try {
    window.localStorage.setItem(storyStorageKey, JSON.stringify(progress));
  } catch (error) {
    console.error('Could not save this device’s bedtime story progress:', error);
  }

  const syncRequest = window.DearPipProgress?.save('bedtime', progress);
  syncRequest?.catch((error) => {
    console.error('Could not sync bedtime story progress:', error);
  });
}

function setBedtimeScreen(view) {
  document.documentElement.dataset.bedtimeView = view;
  document.querySelectorAll('section[data-bedtime-view]').forEach((section) => {
    section.hidden = section.dataset.bedtimeView !== view;
  });
}

function updatePreviousButton() {
  const previous = window.history.state?.previous;
  previousButton.hidden = !(
    activeRoute.view === 'reader'
    && previous?.view === 'reader'
    && previous.story === activeRoute.story
    && previous.scene !== activeRoute.scene
  );
}

function updateStoryProgress(adventure) {
  const visitedCount = adventure.scenes.filter((sceneId) => storyVisited.has(sceneId)).length;
  const total = adventure.scenes.length;
  const percentage = Math.round((visitedCount / total) * 100);
  progressBar.value = percentage;
  progressCount.textContent = `${visitedCount} of ${total} scenes`;
}

function renderScene(route, animate) {
  const current = story[route.scene];
  const adventure = adventures[route.story];
  if (!current || !adventure.scenes.includes(route.scene)) {
    navigateTo({ view: 'library' }, false, true);
    return;
  }

  scene.classList.toggle('is-arriving', animate);
  const sceneAssets = bedtimeAssets.stories[route.story].sceneImages[route.scene];
  sceneArt.className = `bedtime-scene-art bedtime-scene-art--${current.motif || adventure.motif} bedtime-scene-art--scene-${route.scene}`;
  sceneArt.dataset.storyId = route.story;
  sceneArt.dataset.sceneId = route.scene;
  sceneArt.replaceChildren();
  sceneArt.setAttribute('aria-hidden', 'true');
  sceneArt.removeAttribute('role');
  sceneArt.removeAttribute('aria-label');
  if (sceneAssets?.src) {
    const image = document.createElement('img');
    image.className = 'bedtime-scene-art__image';
    image.src = sceneAssets.src;
    image.alt = sceneAssets.alt;
    image.addEventListener('load', () => {
      sceneArt.classList.add('has-scene-image');
      sceneArt.removeAttribute('aria-hidden');
      sceneArt.setAttribute('role', 'img');
      sceneArt.setAttribute('aria-label', sceneAssets.alt);
    }, { once: true });
    image.addEventListener('error', () => {
      image.remove();
      sceneArt.classList.remove('has-scene-image');
      sceneArt.setAttribute('aria-hidden', 'true');
      sceneArt.removeAttribute('role');
      sceneArt.removeAttribute('aria-label');
    }, { once: true });
    sceneArt.append(image);
  }

  sceneLabel.textContent = current.label;
  sceneTitle.textContent = current.title;
  storyCopy.textContent = current.text;
  choices.replaceChildren();
  current.choices?.forEach((choice) => {
    const button = document.createElement('button');
    button.className = 'bedtime-choice';
    button.type = 'button';
    button.textContent = choice.label;
    button.addEventListener('click', () => {
      if (!adventure.scenes.includes(choice.next) || !story[choice.next]) return;
      window.DearPipSounds?.play('pageTurn');
      navigateTo({ view: 'reader', story: route.story, scene: choice.next });
    });
    choices.append(button);
  });

  continueButton.hidden = !current.next;
  if (current.next) {
    continueButton.onclick = () => navigateTo({
      view: 'reader',
      story: route.story,
      scene: current.next,
    });
  } else {
    continueButton.onclick = null;
  }
  endingMessage.hidden = !current.ending;
  storyVisited.add(route.scene);
  updateStoryProgress(adventure);
  const terminal = current.ending === true && !current.next && !current.choices?.length;
  if (terminal) {
    const newlyCompleted = !completedStories.has(route.story);
    completedStories.add(route.story);
    setReaderState('completed');
    saveStoryProgress(route.scene);
    if (newlyCompleted) renderLibrary();
    if (newlyCompleted) window.DearPipSounds?.play('game-win');
  } else {
    saveStoryProgress(route.scene);
  }
}

function renderRoute(route, animate = false) {
  const previousRoute = activeRoute;
  const enteringReader = route.view === 'reader'
    && (previousRoute.view !== 'reader' || route.story !== selectedStory || route.restart === true);
  if (enteringReader) {
    selectedStory = route.story;
    requestedScene = route.scene;
    readerState = 'waiting';
    readerStateElement.dataset.readerState = 'waiting';
  }
  activeRoute = route;
  setBedtimeScreen(route.view);
  const storyIsVisible = route.view === 'reader' && (readerState === 'reading' || readerState === 'completed');
  window.dispatchEvent(new CustomEvent('bedtime:routechange', {
    detail: {
      view: route.view,
      story: route.story || null,
      scene: route.scene || null,
      title: route.view === 'reader' ? adventures[route.story]?.title : null,
      ending: storyIsVisible && Boolean(story[route.scene]?.ending),
      animate: storyIsVisible && animate,
      waiting: route.view === 'reader' && !storyIsVisible,
    },
  }));
  if (route.view !== 'reader') {
    if (previousRoute.view === 'reader') enterWaitingState();
    return;
  }

  const adventure = adventures[route.story];
  document.querySelector('#bedtimeStoryTitle').textContent = adventure.title;
  document.querySelector('#bedtimeStoryDescription').textContent = adventure.description;
  updatePreviousButton();
  if (enteringReader) {
    enterWaitingState();
    if (pipReady) onPipReady();
    return;
  }
  if (readerState === 'waiting' || readerState === 'greeting') {
    requestedScene = route.scene;
    if (pipReady && readerState === 'waiting') onPipReady();
    return;
  }
  if (readerState === 'completed' && !story[route.scene]?.ending) setReaderState('reading');
  renderScene(route, animate);
}

function onPipReady() {
  pipReady = true;
  if (activeRoute.view !== 'reader' || readerState !== 'waiting') return;
  waitingCopy.hidden = true;
  arrivalCopy.textContent = 'Pip is here! Are you ready for your story?';
  beginStoryButton.textContent = 'Begin Story';
  setReaderState('greeting');
}

function onPipFallback(event) {
  pipReady = true;
  if (activeRoute.view !== 'reader' || readerState !== 'waiting') return;
  waitingCopy.hidden = true;
  arrivalCopy.textContent = event.detail?.message || 'Pip could not arrive, but your story is ready to begin.';
  beginStoryButton.textContent = 'Begin Story';
  setReaderState('greeting');
}

function beginStory() {
  const adventure = adventures[activeRoute.story];
  if (readerState !== 'greeting' || activeRoute.view !== 'reader' || !adventure
      || !adventure.scenes.includes(requestedScene)) return;

  const replaying = completedStories.has(activeRoute.story);
  let sceneId = adventure.start;
  if (!replaying && requestedScene !== adventure.start) {
    sceneId = requestedScene;
  } else if (!replaying && localStoryProgress?.adventure === activeRoute.story
      && adventure.scenes.includes(localStoryProgress.scene)
      && !story[localStoryProgress.scene]?.ending) {
    sceneId = localStoryProgress.scene;
  }
  if (replaying) adventure.scenes.forEach((id) => storyVisited.delete(id));

  navigateTo({ view: 'reader', story: activeRoute.story, scene: sceneId }, false, true);
  if (!setReaderState('reading')) return;
  window.dispatchEvent(new CustomEvent('bedtime:routechange', {
    detail: { view: 'reader', story: activeRoute.story, scene: sceneId, title: adventure.title, ending: false, animate: false, waiting: false },
  }));
  renderScene(activeRoute, false);
}

window.addEventListener('bedtime:pip-ready', onPipReady);
window.addEventListener('bedtime:pip-fallback', onPipFallback);

function navigateTo(route, animate = true, replace = false) {
  const safeRoute = route.view === 'reader'
    && adventures[route.story]?.scenes.includes(route.scene)
    ? route
    : route.view === 'intro' || route.view === 'library'
      ? route
      : { view: 'library' };
  const previous = replace ? null : activeRoute;
  const method = replace ? 'replaceState' : 'pushState';
  window.history[method](
    { bedtimeStorybook: true, route: safeRoute, previous },
    '',
    `${window.location.pathname}${bedtimeRouteSearch(safeRoute)}`,
  );
  renderRoute(safeRoute, animate);
}

function renderCurrentLocation(animate = false) {
  const parsed = parseBedtimeRoute(window.location.search);
  const normalizedSearch = bedtimeRouteSearch(parsed.route);
  const shouldNormalize = !parsed.valid || normalizedSearch !== window.location.search;
  if (shouldNormalize) {
    window.history.replaceState(
      { bedtimeStorybook: true, route: parsed.route, previous: null },
      '',
      `${window.location.pathname}${normalizedSearch}`,
    );
  } else if (!window.history.state?.bedtimeStorybook) {
    window.history.replaceState(
      { bedtimeStorybook: true, route: parsed.route, previous: null },
      '',
      `${window.location.pathname}${normalizedSearch}`,
    );
  }
  renderRoute(parsed.route, animate);
}

function renderLibrary() {
  const library = document.querySelector('#bedtimeLibraryGrid');
  library.replaceChildren();
  const groups = [
    { id: 'main', title: 'Adventures Through the Garden', description: 'Follow Pip through moonlit paths and discover little wonders along the way.' },
    { id: 'friends', title: 'Meet the Garden Friends', description: "Every little friend has a story, a dream, and a light of their own." },
  ];

  const makeCard = (id, groupId, completed = false) => {
    const adventure = adventures[id];
    const card = document.createElement('article');
    card.className = `bedtime-story-card${completed ? ' is-completed' : ''}`;
    card.dataset.storyCard = id;
    const art = document.createElement('div');
    art.className = `bedtime-story-card__art bedtime-art--${adventure.motif}`;
    const image = document.createElement('img');
    image.className = 'bedtime-story-card__cover';
    image.src = bedtimeAssets.stories[id].coverImage;
    image.alt = bedtimeAssets.stories[id].coverAlt;
    image.width = 1024;
    image.height = 1536;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => {
      image.remove();
      art.classList.add('is-placeholder');
      art.setAttribute('role', 'img');
      art.setAttribute('aria-label', `${adventure.title} cover artwork is unavailable; decorative placeholder shown.`);
    }, { once: true });
    art.append(image);

    const copy = document.createElement('div');
    copy.className = 'bedtime-story-card__copy';
    const eyebrow = document.createElement('p');
    eyebrow.className = 'bedtime-story-card__chapter';
    eyebrow.textContent = completed ? 'COMPLETED STORY' : groupId === 'main' ? 'MAIN ADVENTURE' : 'GARDEN FRIEND STORY';
    const title = document.createElement('h3');
    title.textContent = adventure.title;
    const description = document.createElement('p');
    description.textContent = adventure.description;
    copy.append(eyebrow, title, description);
    if (completed) {
      const badge = document.createElement('span');
      badge.className = 'bedtime-completed-badge';
      badge.textContent = 'Completed';
      copy.append(badge);
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'bedtime-read-button';
    button.dataset.openStory = id;
    button.textContent = completed ? 'Read Again' : 'Read This Story';
    button.addEventListener('click', () => {
      window.DearPipSounds?.play('bookOpen');
      navigateTo({ view: 'reader', story: id, scene: adventure.start, ...(completed ? { restart: true } : {}) });
    });
    copy.append(button);
    card.append(art, copy);
    return card;
  };

  const makeShelf = ({ id, title, description, storyIds, completed = false }) => {
    const section = document.createElement('section');
    section.className = 'bedtime-story-shelf';
    section.setAttribute('aria-labelledby', `bedtimeShelfTitle-${id}`);
    const heading = document.createElement('div');
    heading.className = 'bedtime-story-shelf__heading';
    const headingCopy = document.createElement('div');
    const titleElement = document.createElement('h2');
    titleElement.className = 'bedtime-story-group__title';
    titleElement.id = `bedtimeShelfTitle-${id}`;
    titleElement.textContent = title;
    const descriptionElement = document.createElement('p');
    descriptionElement.className = 'bedtime-story-group__description';
    descriptionElement.textContent = description;
    headingCopy.append(titleElement, descriptionElement);

    const controls = document.createElement('div');
    controls.className = 'bedtime-shelf-controls';
    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'bedtime-shelf-arrow';
    previous.setAttribute('aria-label', `Previous ${title}`);
    previous.textContent = '←';
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'bedtime-shelf-arrow';
    next.setAttribute('aria-label', `Next ${title}`);
    next.textContent = '→';
    controls.append(previous, next);
    heading.append(headingCopy, controls);

    const track = document.createElement('div');
    track.className = 'bedtime-story-shelf__track';
    track.id = `bedtimeShelf-${id}`;
    track.tabIndex = 0;
    track.setAttribute('role', 'region');
    track.setAttribute('aria-label', `${title} story books`);
    const updateArrows = () => {
      previous.disabled = track.scrollLeft <= 1;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
    };
    previous.addEventListener('click', () => track.scrollBy({ left: -track.clientWidth * 0.82, behavior: 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: track.clientWidth * 0.82, behavior: 'smooth' }));
    track.addEventListener('scroll', updateArrows, { passive: true });
    if (storyIds.length) storyIds.forEach((storyId) => track.append(makeCard(storyId, id, completed)));
    else {
      const empty = document.createElement('div');
      empty.className = 'bedtime-shelf-empty';
      const title = document.createElement('p');
      title.className = 'bedtime-shelf-empty__title';
      title.textContent = 'Your next finished adventure will find a home here.';
      const description = document.createElement('p');
      description.className = 'bedtime-shelf-empty__description';
      description.textContent = 'Complete a story with Pip, and it will appear on this shelf.';
      empty.append(title, description);
      track.append(empty);
    }
    section.append(heading, track);
    library.append(section);
    requestAnimationFrame(updateArrows);
  };

  groups.forEach((group) => {
    const ids = Object.entries(adventures).filter(([, adventure]) => adventure.group === group.id).map(([id]) => id);
    makeShelf({ ...group, storyIds: ids });
  });
  makeShelf({
    id: 'completed',
    title: 'Completed Stories',
    description: 'Your finished adventures, waiting to be opened again.',
    storyIds: Object.keys(adventures).filter((id) => completedStories.has(id)),
    completed: true,
  });
}
function readSavedStoryProgress() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(storyStorageKey) || 'null');
    if (saved?.version !== 1 || !Array.isArray(saved.visited)) return;
    saved.visited.filter((sceneId) => Object.hasOwn(story, sceneId)).forEach((sceneId) => storyVisited.add(sceneId));
    const completed = Array.isArray(saved.completed) ? saved.completed.filter((id) => Object.hasOwn(adventures, id)) : [];
    completed.forEach((id) => completedStories.add(id));
    const adventure = Object.hasOwn(adventures, saved.adventure) ? saved.adventure : null;
    const sceneId = typeof saved.scene === 'string' && Object.hasOwn(story, saved.scene) ? saved.scene : null;
    localStoryProgress = { version: 1, adventure, scene: sceneId, visited: [...storyVisited], completed: [...completedStories] };
  } catch (error) {
    console.error('Could not read this device\'s bedtime story progress:', error);
  }
}

async function loadPersistedStoryProgress() {
  try {
    const result = await window.DearPipProgress?.load('bedtime', localStoryProgress);
    const data = result?.data;
    if (!data || data.version !== 1) return;
    if (Array.isArray(data.completed)) data.completed.filter((id) => Object.hasOwn(adventures, id)).forEach((id) => completedStories.add(id));
    if (Array.isArray(data.visited)) data.visited.filter((id) => Object.hasOwn(story, id)).forEach((id) => storyVisited.add(id));
    const adventure = Object.hasOwn(adventures, data.adventure) ? data.adventure : null;
    const sceneId = typeof data.scene === 'string' && Object.hasOwn(story, data.scene) ? data.scene : null;
    if (adventure && sceneId && adventures[adventure].scenes.includes(sceneId)) {
      localStoryProgress = { version: 1, adventure, scene: sceneId, visited: [...storyVisited], completed: [...completedStories] };
    } else if (localStoryProgress) {
      localStoryProgress.completed = [...completedStories];
      localStoryProgress.visited = [...storyVisited];
    }
    renderLibrary();
  } catch (error) {
    console.error('Could not load saved bedtime stories:', error);
  }
}
document.querySelector('#bedtimeCoverArt').style.setProperty(
  '--bedtime-cover-image',
  `url("${bedtimeAssets.openingCover}")`,
);
renderLibrary();
readSavedStoryProgress();
renderLibrary();
renderCurrentLocation();
loadPersistedStoryProgress();

document.querySelector('#bedtimeOpenBook').addEventListener('click', () => {
  navigateTo({ view: 'library' });
});
document.querySelector('#bedtimeLibraryIntro').addEventListener('click', () => {
  navigateTo({ view: 'intro' });
});
document.querySelector('#bedtimeBackToLibrary').addEventListener('click', () => {
  navigateTo({ view: 'library' });
});
document.querySelector('#bedtimeReturnToIntro').addEventListener('click', () => {
  navigateTo({ view: 'intro' });
});
previousButton.addEventListener('click', () => {
  if (!previousButton.hidden) window.history.back();
});
restartButton.addEventListener('click', () => {
  if (activeRoute.view !== 'reader') return;
  navigateTo({
    view: 'reader',
    story: activeRoute.story,
    scene: adventures[activeRoute.story].start,
    restart: true,
  });
});
document.querySelector('#bedtimeReadAgain').addEventListener('click', () => restartButton.click());
document.querySelector('#bedtimeEndingLibrary').addEventListener('click', () => navigateTo({ view: 'library' }));
window.addEventListener('popstate', () => renderCurrentLocation());
beginStoryButton.addEventListener('click', beginStory);
