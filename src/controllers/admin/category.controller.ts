import type { Request, Response } from "express";
import { categoryService } from "../../services/category.service";
import { categorySchema } from "../../validations/category.validation";
import { buildPagination } from "../../utils/pagination";
import { appendNotice } from "../../utils/flash";

function pageQuery(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function routeParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";
}

function wantsJson(req: Request) {
  const accept = String(req.headers.accept || "").toLowerCase();
  return req.xhr || accept.includes("application/json");
}

function buildPageUrl(page: number, q = "") {
  const params = new URLSearchParams();
  if (q) {
    params.set("q", q);
  }
  if (page > 1) {
    params.set("page", String(page));
  }

  const search = params.toString();
  return search ? `/admin/categories?${search}` : "/admin/categories";
}

function renderPage(res: Response, options: Record<string, unknown>) {
  return res.render("admin/taxonomies/index", {
    layout: "layouts/admin",
    title: "Categories",
    taxonomyKind: "category",
    taxonomyTitle: "Categories",
    taxonomySingular: "Kategori",
    taxonomyCreateLabel: "Tambah Kategori",
    taxonomyIcon: "fa-folder-tree",
    ...options
  });
}

function renderListData(page: number, q: string) {
  return categoryService.listAdmin(page, 9, q).then(({ items, total }) => {
    const pagination = buildPagination(page, total, 9);
    return {
      categories: items,
      total,
      pagination: {
        ...pagination,
        prevUrl: buildPageUrl(pagination.page - 1, q),
        nextUrl: buildPageUrl(pagination.page + 1, q),
        pages: pagination.pages.map((item) => ({
          ...item,
          url: buildPageUrl(item.number, q)
        }))
      }
    };
  });
}

export const categoryController = {
  async index(req: Request, res: Response) {
    const page = pageQuery(req.query.page);
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const data = await renderListData(page, q);
    renderPage(res, {
      ...data,
      page,
      q,
      errors: undefined,
      values: {},
      editingCategory: null
    });
  },

  async store(req: Request, res: Response) {
    const parsed = categorySchema.safeParse(req.body);
    const page = pageQuery(req.query.page);
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const data = await renderListData(page, q);

    if (!parsed.success) {
      if (wantsJson(req)) {
        return res.status(422).json({
          error: "Periksa kembali isian category.",
          errors: parsed.error.flatten().fieldErrors
        });
      }

      return renderPage(res.status(422), {
        ...data,
        page,
        q,
        notice: "Periksa kembali isian category.",
        noticeType: "warning",
        editingCategory: null,
        errors: parsed.error.flatten().fieldErrors,
        values: req.body
      });
    }

    const item = await categoryService.create(parsed.data.name);

    if (wantsJson(req)) {
      return res.json({ item });
    }

    return res.redirect(appendNotice(buildPageUrl(page, q), "Category berhasil ditambahkan.", "success"));
  },

  async editForm(req: Request, res: Response) {
    const page = pageQuery(req.query.page);
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const data = await renderListData(page, q);
    const editingCategory = await categoryService.findById(routeParam(req.params.id));

    if (!editingCategory) {
      return res.status(404).render("errors/404", { layout: "layouts/blog", title: "Not found" });
    }

    return renderPage(res, {
      ...data,
      page,
      q,
      editingCategory,
      errors: undefined,
      values: {}
    });
  },

  async update(req: Request, res: Response) {
    const parsed = categorySchema.safeParse(req.body);
    const page = pageQuery(req.query.page);
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const data = await renderListData(page, q);
    const editingCategory = await categoryService.findById(routeParam(req.params.id));

    if (!parsed.success) {
      if (wantsJson(req)) {
        return res.status(422).json({
          error: "Periksa kembali isian category.",
          errors: parsed.error.flatten().fieldErrors
        });
      }

      return renderPage(res.status(422), {
        ...data,
        page,
        q,
        notice: "Periksa kembali isian category.",
        noticeType: "warning",
        editingCategory,
        errors: parsed.error.flatten().fieldErrors,
        values: req.body
      });
    }

    const item = await categoryService.update(routeParam(req.params.id), parsed.data.name);

    if (wantsJson(req)) {
      return res.json({ item });
    }

    return res.redirect(appendNotice(buildPageUrl(page, q), "Category berhasil diperbarui.", "success"));
  },

  async destroy(req: Request, res: Response) {
    const id = routeParam(req.params.id);
    await categoryService.delete(id);
    const page = pageQuery(req.query.page);
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

    if (wantsJson(req)) {
      return res.json({ success: true, id });
    }

    return res.redirect(appendNotice(buildPageUrl(page, q), "Category berhasil dihapus.", "success"));
  }
};
