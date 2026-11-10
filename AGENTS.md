# Architecture rules
- Keep Budget Bro's product UI and existing feature logic in the shared React app; limit native Android code to operating-system integrations such as receiving shares, so web and Android behavior stays aligned.
- Keep password recovery on a public route outside signed-in redirects so recovery sessions can set a password and then sign out.
