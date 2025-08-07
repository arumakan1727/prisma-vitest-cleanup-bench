ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenantId" ON "public"."tenants" USING ("id" = current_setting('app.tenantId')::uuid);

ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenantId" ON "public"."users" USING ("tenantId" = current_setting('app.tenantId')::uuid);

ALTER TABLE "public"."user_actives" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenantId" ON "public"."user_actives" USING ("tenantId" = current_setting('app.tenantId')::uuid);

ALTER TABLE "public"."user_deleted" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenantId" ON "public"."user_deleted" USING ("tenantId" = current_setting('app.tenantId')::uuid);

ALTER TABLE "public"."articles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenantId" ON "public"."articles" USING ("tenantId" = current_setting('app.tenantId')::uuid);

ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenantId" ON "public"."comments" USING ("tenantId" = current_setting('app.tenantId')::uuid);
