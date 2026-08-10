## Authentication

Auth related db already defined in Auth & Identity Schema so as we already described whenever a new user created we should create entry in `profile` and `tenant` to create profile and personal workspace for that user.

1. Sign In
   1. path: `/auth/sign-in`
   2. reference: https://preview--bandinet-publicator-gestionale-progessionisti.lovable.app/login
   3. notes:
      1. we can use supabase auth system here
      2. only internal user should be able to sign in to this page.
      3. if any user is not logged in then we should redirect them to his page.
      4. after login it should support `redirectTo` pattern to redirect them to the previous page. otherwise just redirect to `/auth/mfa/verify`
2. 2FA Verify
   1. path: `/auth/2fa/verify`
   2. reference:

      !Screenshot 2026-08-07 at 1.07.11 AM.png

   3. notes
      1. on loveable it’s in login page. but we need to move into separate page
      2. we need to have a guard regarding 2FA verification. so if a user is logged in but tries to visit any page we should just redirect him to this page
      3. after verification it should support `redirectTo` pattern to redirect them to the previous page they tried to visit, otherwise just redirect ot `/`
      4. if any user don’t have 2FA setup then we should show message and a CTA button to navigate to `/auth/2fa/setup`
3. 2FA Setup
   1. path: `/auth/2fa/setup`
   2. reference:

      !Screenshot 2026-08-07 at 1.18.03 AM.png

   3. notes:
      1. on loveable it’s in login page. but we need to move into separate page
      2. if user have 2fa already setup then show proper message and buttons to go back to previous page or navigate to home
      3. we should have a guard to redirect users whenever they don’t have a 2FA setup.
4. Forget Password
   1. path: `/auth/forget-password`
   2. reference:

      !Screenshot 2026-08-07 at 1.32.43 AM.png

   3. notes:
      1. on loveable it’s in login page. but we need to move into separate page
      2. from this page user will request to reset password
      3. we can use supabase auth features to request to reset password
5. Reset Password
   1. path: `/auth/reset-password`
   2. notes:
      1. from reset password request email it will redirect to this page
      2. after reset password complete it will redirect to `/`

**Connected DB**

- Auth & Identity Schema

## Manage Assets

We need to centralize assets management with the `assets` table and `assets` module so other resources can just junction table around it and reuse the logics. later we will have a assets upload api per resources like:

- `/profile/avatar` - API to upload user avatar
- `/grants/assets` - API to upload grants related assets

this way we can have proper validation per resource and we can reuse the logic also.

**Connected DB**

- Assets Schema

## Manage account

reference: https://preview--bandinet-publicator-gestionale-progessionisti.lovable.app/profilo

!image.png

from this page user should be able to update his

- Avatar
- Profile details
- Change password
- Check 2FA option. (do not allow to disable)

Since this API’s are user scoped so we can build in a way that later regular user can use it also.

**Connected DB**

- Auth & Identity Schema
- Assets Schema

## Manage roles and permissions

1. Manage Users
   1. path: `/account/users`
   2. reference: https://preview--bandinet-publicator-gestionale-progessionisti.lovable.app/account/users

      !image.png

   3. notes:
      1. we should be able to manage users from here
      2. invite other users
      3. ban users
      4. change password for others
      5. reset 2FA for others
2. Manage Roles
   1. path: `/account/roles`
   2. reference: https://preview--bandinet-publicator-gestionale-progessionisti.lovable.app/account/roles

      !image.png

   3. notes:
      1. We should be able to manage roles from here
      2. Add new permissions
      3. Initially we might not have all permissions defined so we can skip but once a resource is built we can create permission tokens for it.
      4. Frontend UI should reflect that way. If i don’t have access to any resource then we shouldn’t show it. Also regarding the path we should show access forbidden message.
      5. there should be default role called `super_admin` and a idempotent script to sync all permissions
      6. For getting overall idea how to implement and type safe guards you can check our existing project Backoffice hub backend code.

**Connected DB**

- Auth & Identity Schema - `profiles` `internal_roles`

## Settings

- path: `/settings`
- reference: https://preview--bandinet-publicator-gestionale-progessionisti.lovable.app/impostazioni
  !image.png
- notes:
  - Here we need to manage (**Etichette)** `grant_tags` and **(Categorie date**) `grant_date_types` tables content
  - This should be protected by role permission. not everyone can update it
  - Some values are system defined so we need a idempotent script to seed that. and these values are not delete able.

**Connected DB**

- Grants Schema - `grant_tags` `grant_date_types`

## Manage grants

1. Grants List By status
   1. paths: `/grants/all` `/grants/todo` `/grants/published` `/grants/archived`
   2. reference:
      1. https://preview--bandinet-publicator-gestionale-progessionisti.lovable.app/bandi/tutti
      2. screenshot

         !image.png
   3. notes:
      1. list all grants
      2. list filters must be sync with URL so we can easily share with others
      3. all these pages are almost same and they share same component. it just they have default status filter except the all page.
2. Grants list by assigned to me
   1. path: `/grants/assigned`
   2. reference: https://preview--bandinet-publicator-gestionale-progessionisti.lovable.app/bandi/assegnati
   3. notes:
      1. similar to Grants List By status
3. Grants list by date types
   1. path: `/grants/deadlines`
   2. reference:
      1. https://preview--bandinet-publicator-gestionale-progessionisti.lovable.app/bandi/scadenze
      2. screenshot

         !image.png
   3. notes:
      1. here we list jobs by `grant_date_types`
4. Grants Creator
   1. path: `/grants/upload`
   2. reference: https://preview--bandinet-publicator-gestionale-progessionisti.lovable.app/bandi/upload

      !image.png

   3. notes:
      1. for now we need create from blank feature only. regarding other two, new dev can skip now
      2. after creation it should redirect me to list page with query param to open the editor sheet
      3. Regarding **Document Upload: @Tommaso De Lorenzo** can help us on it. once the system is ready new dev can integrate it
5. Grants Editor
   1. path: open as a sheet from right side
   2. reference:

      !image.png

   3. notes:
      1. Editor must be modular. here we can have all data from AI extractor already or we created from blank. that’s why it’s safe to treat it as a blank editor always.
      2. Newsletter feature is out of scope so do not consider it.
      3. Write notes
      4. Track version history (check BOH for implementation)
      5. Assign grant to others
      6. Able to toggle featured flag
      7. Show alert if changes saved and he tries to close the sheet

**Connected DB**

- Grants Schema
- Assets Schema

## Grant Stats

- path: `/stats/grants`
- reference:
  - https://preview--bandinet-publicator-gestionale-progessionisti.lovable.app/statistiche/bandi
  - screenshot
    !image.png
- notes:
  - check loveable project to analyze stats logics
