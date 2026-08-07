window.PortfolioRegistry = (() => {
  function create() {
    const modules = new Map();

    function register(module) {
      if (!module?.id) throw new Error("Portfolio module must provide an id.");
      if (modules.has(module.id)) throw new Error(`Portfolio module already registered: ${module.id}`);
      modules.set(module.id, module);
      return module;
    }

    function get(moduleId) {
      return modules.get(moduleId) || null;
    }

    function list() {
      return Array.from(modules.values());
    }

    function findByRoute(hash) {
      const route = (hash || "").replace(/^#/, "");
      return list().find((module) => (module.routes || []).includes(route)) || null;
    }

    return { register, get, list, findByRoute };
  }

  return { create };
})();
