-- ============================================================
--  Sales Academy — Phase 12 Part 2: English Course seed + Announcements
-- ============================================================

-- ── ENGLISH LEARNING COURSE ────────────────────────────────────────────────

DO $$
DECLARE
  v_admin_id    uuid;
  v_course_id   uuid;
  v_mod1_id     uuid;
  v_mod2_id     uuid;
  v_mod3_id     uuid;
  v_mod4_id     uuid;
  v_lesson_id   uuid;
BEGIN

-- Get admin user
SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
IF v_admin_id IS NULL THEN
  RAISE EXCEPTION 'No admin user found to set as course creator';
END IF;

-- Create the course (idempotent)
INSERT INTO public.courses (title, description, status, thumbnail_url, qualifying_for_reseller, created_by)
VALUES (
  'English for Sales — Talking to Foreign Clients',
  'Master essential English communication skills for dealing with international clients. Learn phrases, call handling, polite objection responses, and business vocabulary that will help you close deals confidently.',
  'published',
  null,
  false,
  v_admin_id
)
ON CONFLICT DO NOTHING
RETURNING id INTO v_course_id;

IF v_course_id IS NULL THEN
  SELECT id INTO v_course_id FROM public.courses
  WHERE title = 'English for Sales — Talking to Foreign Clients'
  LIMIT 1;
END IF;

IF v_course_id IS NULL THEN RETURN; END IF;

-- Module 1: Common English Sales Phrases
INSERT INTO public.modules (course_id, title, description, order_index)
VALUES (v_course_id, 'Common English Sales Phrases', 'Ready-to-use phrases for everyday sales conversations', 1)
ON CONFLICT DO NOTHING
RETURNING id INTO v_mod1_id;

IF v_mod1_id IS NULL THEN
  SELECT id INTO v_mod1_id FROM public.modules WHERE course_id = v_course_id AND order_index = 1 LIMIT 1;
END IF;

-- Module 1 Lesson 1
INSERT INTO public.lessons (module_id, title, description, order_index, status)
VALUES (v_mod1_id, 'Opening the Conversation', 'First impressions in English: greetings, introductions, and openers', 1, 'published')
ON CONFLICT DO NOTHING
RETURNING id INTO v_lesson_id;

IF v_lesson_id IS NULL THEN
  SELECT id INTO v_lesson_id FROM public.lessons WHERE module_id = v_mod1_id AND order_index = 1 LIMIT 1;
END IF;

INSERT INTO public.content_blocks (lesson_id, type, content, order_index) VALUES
(v_lesson_id, 'text', jsonb_build_object('body', '## Opening Lines That Work

When you first contact a foreign client — whether on WhatsApp, email, or a call — your opening sets the tone. Here are proven openers:

**Formal Openers:**
- "Hello [Name], I hope you''re doing well. My name is [Your Name] from Sales Academy."
- "Good morning/afternoon! I''m reaching out because I believe we have something that can really help your business."
- "Hi [Name], thank you for your time. I''d love to share something exciting with you today."

**Friendly / Casual Openers:**
- "Hey [Name]! Hope all is good on your end."
- "Hi there! Quick question — do you currently use any [product category]?"

**Key Tips:**
- Always use their first name if you know it
- Keep the opener under 2 sentences
- End with a question to get them talking'), 1)
ON CONFLICT DO NOTHING;

INSERT INTO public.content_blocks (lesson_id, type, content, order_index) VALUES
(v_lesson_id, 'text', jsonb_build_object('body', '## Practice Exercises

**Exercise 1:** Write 3 different opening messages in English for a client interested in a graphic design tool.

**Exercise 2:** Practice saying these phrases out loud 5 times each:
- "I''d love to help you find the right solution."
- "Could I ask you a quick question?"
- "Let me show you how this works."

**Remember:** Confidence comes from practice. Even if your English isn''t perfect, clear and confident communication wins clients.'), 2)
ON CONFLICT DO NOTHING;

-- Module 1 Lesson 2
INSERT INTO public.lessons (module_id, title, description, order_index, status)
VALUES (v_mod1_id, 'Closing & Follow-up Phrases', 'English phrases to close deals and follow up professionally', 2, 'published')
ON CONFLICT DO NOTHING
RETURNING id INTO v_lesson_id;

IF v_lesson_id IS NULL THEN
  SELECT id INTO v_lesson_id FROM public.lessons WHERE module_id = v_mod1_id AND order_index = 2 LIMIT 1;
END IF;

INSERT INTO public.content_blocks (lesson_id, type, content, order_index) VALUES
(v_lesson_id, 'text', jsonb_build_object('body', '## Closing the Sale in English

The close is the most important part. Here are natural English closing phrases:

**Trial Closes (to test interest):**
- "Does this sound like something that could work for you?"
- "Are you seeing how this would benefit your business?"
- "On a scale of 1-10, how interested are you?"

**Direct Closes:**
- "I''d love to get you started today. Can we proceed?"
- "Shall I set this up for you right now?"
- "All I need is your confirmation and we can begin."

**Urgency Closes:**
- "This offer is only available until [date]. I don''t want you to miss out."
- "We have limited spots — I want to make sure you get one."
- "Today''s pricing is the best you''ll see. Want to lock it in?"'), 1)
ON CONFLICT DO NOTHING;

INSERT INTO public.content_blocks (lesson_id, type, content, order_index) VALUES
(v_lesson_id, 'text', jsonb_build_object('body', '## Professional Follow-up Messages

When a client doesn''t respond, follow up politely:

**Day 1 Follow-up:**
"Hi [Name], just checking in on my earlier message. Happy to answer any questions you might have!"

**Day 3 Follow-up:**
"Hi [Name], I know you''re busy — just wanted to make sure my message didn''t get lost. Would love to connect when you have 5 minutes."

**Final Follow-up:**
"Hi [Name], I''ll respect your time and won''t follow up after this. If you ever want to explore [product], I''m here. Wishing you all the best!"

**Pro Tip:** Never sound desperate or pushy in follow-ups. Confident, friendly, and brief always wins.'), 2)
ON CONFLICT DO NOTHING;

-- Module 2: Handling Foreign Client Calls
INSERT INTO public.modules (course_id, title, description, order_index)
VALUES (v_course_id, 'Handling Foreign Client Calls & Chats', 'Communication strategies for international clients', 2)
ON CONFLICT DO NOTHING
RETURNING id INTO v_mod2_id;

IF v_mod2_id IS NULL THEN
  SELECT id INTO v_mod2_id FROM public.modules WHERE course_id = v_course_id AND order_index = 2 LIMIT 1;
END IF;

INSERT INTO public.lessons (module_id, title, description, order_index, status)
VALUES (v_mod2_id, 'WhatsApp & Chat Communication', 'Professional WhatsApp messaging with international clients', 1, 'published')
ON CONFLICT DO NOTHING
RETURNING id INTO v_lesson_id;

IF v_lesson_id IS NULL THEN
  SELECT id INTO v_lesson_id FROM public.lessons WHERE module_id = v_mod2_id AND order_index = 1 LIMIT 1;
END IF;

INSERT INTO public.content_blocks (lesson_id, type, content, order_index) VALUES
(v_lesson_id, 'text', jsonb_build_object('body', '## WhatsApp Best Practices with Foreign Clients

WhatsApp is our main communication channel. Here''s how to use it professionally with international clients:

**Message Formatting:**
- Keep messages short (3-5 sentences max)
- Use bullet points for features/benefits
- Send one idea per message, not a wall of text
- Use emojis sparingly and professionally (✅ 👍 are okay; 😂 is not)

**Response Time:**
- Reply within 1-2 hours during business hours
- If you can''t reply fully, send a quick acknowledgment: "Got it! I''ll send details shortly."

**Professional Templates:**
- Introduction: "Hi [Name], I''m [Your Name] from [Company]. I''d love to share something useful with you. Is this a good time?"
- Sending info: "Here are the key details you asked for: [info]. Let me know if you have any questions!"
- After no reply: "Hi [Name], just following up! Happy to answer any questions 😊"'), 1)
ON CONFLICT DO NOTHING;

-- Module 3: Polite Objection Handling
INSERT INTO public.modules (course_id, title, description, order_index)
VALUES (v_course_id, 'Polite Objection Handling in English', 'Handle pushback professionally without being aggressive', 3)
ON CONFLICT DO NOTHING
RETURNING id INTO v_mod3_id;

IF v_mod3_id IS NULL THEN
  SELECT id INTO v_mod3_id FROM public.modules WHERE course_id = v_course_id AND order_index = 3 LIMIT 1;
END IF;

INSERT INTO public.lessons (module_id, title, description, order_index, status)
VALUES (v_mod3_id, 'Responding to Common Objections', 'Polite English responses to price, timing, and trust objections', 1, 'published')
ON CONFLICT DO NOTHING
RETURNING id INTO v_lesson_id;

IF v_lesson_id IS NULL THEN
  SELECT id INTO v_lesson_id FROM public.lessons WHERE module_id = v_mod3_id AND order_index = 1 LIMIT 1;
END IF;

INSERT INTO public.content_blocks (lesson_id, type, content, order_index) VALUES
(v_lesson_id, 'text', jsonb_build_object('body', '## Handling Objections with Grace

The golden rule: **Never argue with a client.** Acknowledge, empathize, then redirect.

### "It''s too expensive."
**Wrong:** "No it''s not, it''s very affordable!"
**Right:** "I completely understand — budget is important. Let me show you the value you''re getting for this price... [explain ROI]. Does that make sense?"

### "I need to think about it."
**Wrong:** "What is there to think about?"
**Right:** "Of course, take your time! Can I ask — is there any specific concern I can help clear up right now?"

### "I''m already using something else."
**Wrong:** "That product isn''t as good."
**Right:** "That''s great that you''re already using something! A lot of our clients used [competitor] before. The main reason they switched is [key differentiator]. Would you be open to a quick comparison?"

### "I''m not interested."
**Wrong:** Arguing or repeating the pitch
**Right:** "No problem at all! Would it be okay if I check back in with you in a few weeks? Sometimes timing makes all the difference."'), 1)
ON CONFLICT DO NOTHING;

-- Module 4: Business Vocabulary
INSERT INTO public.modules (course_id, title, description, order_index)
VALUES (v_course_id, 'Business English Vocabulary', 'Key terms and vocabulary for professional sales conversations', 4)
ON CONFLICT DO NOTHING
RETURNING id INTO v_mod4_id;

IF v_mod4_id IS NULL THEN
  SELECT id INTO v_mod4_id FROM public.modules WHERE course_id = v_course_id AND order_index = 4 LIMIT 1;
END IF;

INSERT INTO public.lessons (module_id, title, description, order_index, status)
VALUES (v_mod4_id, 'Essential Sales Vocabulary', 'Words and phrases every salesperson needs to know', 1, 'published')
ON CONFLICT DO NOTHING
RETURNING id INTO v_lesson_id;

IF v_lesson_id IS NULL THEN
  SELECT id INTO v_lesson_id FROM public.lessons WHERE module_id = v_mod4_id AND order_index = 1 LIMIT 1;
END IF;

INSERT INTO public.content_blocks (lesson_id, type, content, order_index) VALUES
(v_lesson_id, 'text', jsonb_build_object('body', '## Core Sales Vocabulary

Learn these words and use them confidently:

| Term | Meaning | Example |
|------|---------|---------|
| **Prospect** | Potential customer | "I have 10 new prospects to contact today." |
| **Lead** | Someone who showed interest | "This lead came from our website." |
| **Follow-up** | Contacting again after first touch | "Let me follow up with you tomorrow." |
| **ROI** | Return on Investment | "The ROI on this tool is excellent." |
| **Demo** | Product demonstration | "Can I give you a quick demo?" |
| **Proposal** | Formal offer document | "I''ll send you a proposal by tomorrow." |
| **Closing** | Finalizing the sale | "Are you ready for us to close this deal?" |
| **Objection** | Client''s concern/resistance | "Let me address your objection." |
| **Commission** | Salesperson''s earning % | "My commission is 15% per sale." |
| **Pipeline** | All deals in progress | "I have 20 deals in my pipeline." |

**Practice:** Use 5 of these words in sentences about your own work today.'), 1)
ON CONFLICT DO NOTHING;

INSERT INTO public.content_blocks (lesson_id, type, content, order_index) VALUES
(v_lesson_id, 'text', jsonb_build_object('body', '## Professional Email & Message Templates

**Introducing Yourself:**
> Subject: Quick Introduction — [Your Name] from [Company]
>
> Hi [Name],
> I hope this message finds you well. My name is [Your Name], and I work with [Company] helping businesses like yours with [benefit].
> I''d love to connect for a quick 10-minute call at your convenience. Would [day/time] work for you?
> Looking forward to hearing from you!
> Best regards,
> [Your Name]

**Sending a Proposal:**
> Hi [Name],
> As discussed, please find the proposal attached. I''ve highlighted the key benefits and pricing on page 2.
> Happy to walk you through it on a call — just let me know!
> Best,
> [Your Name]

**Key Phrases for Professionalism:**
- "As per our conversation..." (referencing what was discussed)
- "Please find attached..." (when sending files)
- "I look forward to hearing from you." (professional closer)
- "Please don''t hesitate to reach out." (inviting contact)
- "At your earliest convenience" (polite urgency)'), 2)
ON CONFLICT DO NOTHING;

END $$;

-- ── ANNOUNCEMENTS TABLE ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  body text NOT NULL,
  attachment_url text,
  attachment_name text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_role text DEFAULT 'all' CHECK (target_role IN ('all', 'salesman', 'admin')),
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements: admin all" ON public.announcements;
CREATE POLICY "announcements: admin all" ON public.announcements
  FOR ALL USING (current_user_role() = 'admin');

DROP POLICY IF EXISTS "announcements: salesman read published" ON public.announcements;
CREATE POLICY "announcements: salesman read published" ON public.announcements
  FOR SELECT USING (
    is_published = true
    AND (target_role = 'all' OR target_role = current_user_role())
  );

-- Announcement reads (track who has seen what)
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcement_reads: user own" ON public.announcement_reads;
CREATE POLICY "announcement_reads: user own" ON public.announcement_reads
  FOR ALL USING (user_id = auth.uid());
