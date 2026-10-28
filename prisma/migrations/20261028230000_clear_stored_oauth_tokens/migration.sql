-- OAuth tokens live only in the encrypted session JWT; clear copies stored by earlier sign-ins.
UPDATE "Account" SET "access_token" = NULL, "refresh_token" = NULL, "id_token" = NULL;
