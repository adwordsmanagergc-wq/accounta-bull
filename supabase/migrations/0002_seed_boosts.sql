-- Accounta-Bull, seed 30 motivational boost messages
-- Safe to re-run: it clears the table first, then re-inserts.

truncate table public.boost_messages restart identity;

insert into public.boost_messages (category, text) values
  -- fitness (7)
  ('fitness', 'Your future body is watching. Give it something to brag about.'),
  ('fitness', 'The hardest rep is the one that gets you off the couch. Do that one.'),
  ('fitness', 'Sweat now, shine later. Charge.'),
  ('fitness', 'You don''t have to be fast. You just have to start.'),
  ('fitness', 'Every bull was once a calf that kept showing up. Move.'),
  ('fitness', 'Nobody ever regretted the workout they actually did.'),
  ('fitness', 'Thirty minutes of discomfort beats a day of "I should have."'),
  -- work (7)
  ('work', 'Deep work beats busy work. Pick the one thing and charge it.'),
  ('work', 'Done is the engine. Perfect is the brake. Ship it.'),
  ('work', 'Your focus is a muscle. This is a rep. Go.'),
  ('work', 'Close the tabs. Open the work. You know the one.'),
  ('work', 'Future-you already thanked you for starting now.'),
  ('work', 'One focused hour outruns a whole distracted day.'),
  ('work', 'Momentum loves a first sentence. Write it.'),
  -- mind (6)
  ('mind', 'Breathe in for four, out for six. Then begin.'),
  ('mind', 'A calm bull still has horns. Steady, then strong.'),
  ('mind', 'You can''t pour from an empty tank. Fill it now.'),
  ('mind', 'Ten quiet minutes is a gift you give the whole day.'),
  ('mind', 'Stillness is a skill. This is your practice round.'),
  ('mind', 'Show up for your mind like it shows up for you.'),
  -- other (4)
  ('other', 'Whatever it is, start small, start now, start scrappy.'),
  ('other', 'The goal doesn''t care how you feel. Feelings follow action.'),
  ('other', 'Two minutes in and you''ll wonder why you waited.'),
  ('other', 'Show up. That''s the whole game.'),
  -- general (6), used across every category
  ('general', 'Discipline is just self-respect on a schedule. Charge.'),
  ('general', 'You didn''t come this far to only come this far.'),
  ('general', 'The herd is watching. Make them proud, make YOU proud.'),
  ('general', 'Small wins stack into big horns. Grab this one.'),
  ('general', 'Don''t break the streak. Not today. Not you.'),
  ('general', 'Lower the bar to "just begin," then blow past it.');
