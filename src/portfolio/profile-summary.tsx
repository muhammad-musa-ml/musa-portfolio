import { RouteLink } from "../lib/router";
import { PROFILE_NUMBERS } from "./profile-details";
import "./profile-sections.css";

export function ProfileNumbers() {
  return (
    <dl className="pf-profile-numbers" aria-label="A few points of reference">
      {PROFILE_NUMBERS.map((number) => (
        <div key={number.label}>
          <dt>{number.label}</dt>
          <dd>
            <RouteLink href={number.href}>{number.value}</RouteLink>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ProfileSummary() {
  return (
    <section
      className="pf-section pf-profile-summary"
      aria-labelledby="profile-summary-title"
    >
      <div>
        <h2 id="profile-summary-title">The work has a history.</h2>
        <p>
          Research, teaching, a product of my own, and the teams I’ve learned
          with. Here is how the pieces connect.
        </p>
      </div>
      <RouteLink className="pf-action" href="/about">
        Experience, education & the rest of me{" "}
        <span aria-hidden="true">↗</span>
      </RouteLink>
    </section>
  );
}
