# Connect MusA.I and live analytics

The implementation is ready for account configuration. Local development uses public portfolio notes until a model key is configured. Local test analytics at port 5181 are separate from real website visits.

## 1. Free model access

1. Sign in to [GroqCloud](https://console.groq.com/keys) and create a project API key on the free plan. A paid upgrade is not required.
2. Add `GROQ_API_KEY` to the ignored `.env.local` file. Do not paste it into chat, Git or a `VITE_` variable.
3. Add the same variable to [Vercel project environment variables](https://vercel.com/musa19/my-portfolio/settings/environment-variables), selecting Production. Keep `MUSAI_PROVIDER_ORDER=groq`.
4. The configured primary model is `openai/gpt-oss-120b`; the secondary model is `openai/gpt-oss-20b`. Both use Groq's account quotas. A second model does not remove the account's rate limit.

An independent Gemini fallback can be configured later with `GEMINI_API_KEY` and `MUSAI_PROVIDER_ORDER=groq,gemini`, after checking that the intended Google project has the desired free-tier billing configuration. It is not enabled merely because an unrelated local Gemini key exists.

## 2. Durable visit storage

1. Sign in to [Upstash](https://console.upstash.com/) and create a **free Redis** database. Avoid enabling a paid plan.
2. In Vercel, add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from that database's REST connection section.
3. A random `ANALYTICS_ADMIN_TOKEN` has been generated in this computer's ignored `.env.local`. Copy that exact value into a server-only Vercel variable with the same name. This authorizes only the private export endpoint; never put it in a URL.
4. Add `ANALYTICS_SITE_ORIGIN=https://iammusa.vercel.app` in Vercel.

The database stores bounded anonymous activity, with 30-day retention. The public app cannot read the reports. Location is approximate country/region/city supplied by Vercel; localhost correctly reports location unavailable.

## 3. Verify and deploy

Restart local development after adding the model key. Confirm an actual model response streams and includes working links. Run the tests and production build. Deploy the reviewed release only after the server variables have been saved; Vercel environment changes need a new deployment.

Verify a real live visit and an authenticated analytics export after deployment. Unit tests use mocks and do not prove that an external account or database is connected.

## 4. See the reports

From `C:\Users\muham\Research\Website`:

```powershell
npm run analytics
```

Open [your private dashboard](http://127.0.0.1:5180). Refresh after browsing the public website. Set the date range to see page views, link/control clicks, scroll milestones, focused time, anonymous journeys, approximate locations, device classes and referring domains. Expand a session to follow its path; use **Export recorded events** to save its data.

The dashboard binds to `127.0.0.1` and keeps its export token on the server. It must be running to view it. Restart after changing `.env.local`. It displays a connection error rather than made-up statistics if configuration is incomplete.

For a separate local test, run `npm run analytics:local` and open [port 5181](http://127.0.0.1:5181). These are developer test visits, not production traffic.

## Account access

GitHub repository access alone cannot configure Vercel secrets, create a Groq key, or connect an Upstash account. The browser must be signed into those accounts, or the owner can enter the above server variables directly. Do not share passwords or API keys in chat.
